import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { tokenManager } from '@/lib/api'

// Message handler type
type MessageHandler = (data: unknown) => void

// WebSocket message types
export type WebSocketMessageType =
  | 'notification'
  | 'shift_update'
  | 'application_update'
  | 'payment_update'

export interface WebSocketMessage {
  type: WebSocketMessageType
  data: unknown
}

// Connection states
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

// Configuration
const RECONNECT_INTERVAL = 3000 // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10
const PING_INTERVAL = 30000 // 30 seconds
const PONG_TIMEOUT = 10000 // 10 seconds

export interface UseWebSocketOptions {
  enabled?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export interface UseWebSocketReturn {
  subscribe: (type: WebSocketMessageType, handler: MessageHandler) => () => void
  connectionState: ConnectionState
  isConnected: boolean
  reconnect: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { enabled = true, onConnect, onDisconnect, onError } = options

  const wsRef = useRef<WebSocket | null>(null)
  const queryClient = useQueryClient()
  const handlersRef = useRef<Map<WebSocketMessageType, MessageHandler[]>>(new Map())
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')

  // Subscribe to a message type
  const subscribe = useCallback((type: WebSocketMessageType, handler: MessageHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, [])
    }
    handlersRef.current.get(type)!.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current.get(type)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }, [])

  // Clear all intervals and timeouts
  const clearTimers = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current)
      pongTimeoutRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Start ping/pong keepalive
  const startPingPong = useCallback((ws: WebSocket) => {
    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping')

        // Set timeout for pong response
        pongTimeoutRef.current = setTimeout(() => {
          if (import.meta.env.DEV) console.warn('WebSocket pong timeout, closing connection')
          ws.close()
        }, PONG_TIMEOUT)
      }
    }, PING_INTERVAL)
  }, [])

  // Connect to WebSocket
  const connect = useCallback(() => {
    const token = tokenManager.getAccessToken()
    if (!token || !enabled) {
      return
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    clearTimers()
    setConnectionState('connecting')

    // Build WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`
    const wsUrl = `${wsHost}/api/v1/ws?token=${token}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (import.meta.env.DEV) console.log('WebSocket connected')
        setConnectionState('connected')
        reconnectAttemptsRef.current = 0
        startPingPong(ws)
        onConnect?.()
      }

      ws.onclose = (event) => {
        if (import.meta.env.DEV) console.log('WebSocket disconnected', event.code, event.reason)
        setConnectionState('disconnected')
        clearTimers()
        onDisconnect?.()

        // Attempt reconnection if not a normal close or auth failure
        if (event.code !== 1000 && event.code !== 4001) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            setConnectionState('reconnecting')
            reconnectAttemptsRef.current++
            const delay = Math.min(
              RECONNECT_INTERVAL * Math.pow(2, reconnectAttemptsRef.current - 1),
              30000 // Max 30 seconds
            )
            if (import.meta.env.DEV) console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)
            reconnectTimeoutRef.current = setTimeout(connect, delay)
          } else {
            if (import.meta.env.DEV) console.error('Max reconnection attempts reached')
          }
        }
      }

      ws.onerror = (error) => {
        if (import.meta.env.DEV) console.error('WebSocket error:', error)
        onError?.(error)
      }

      ws.onmessage = (event) => {
        // Handle pong response
        if (event.data === 'pong') {
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current)
            pongTimeoutRef.current = null
          }
          return
        }

        // Parse JSON message
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          const handlers = handlersRef.current.get(message.type)

          // Call registered handlers
          if (handlers) {
            handlers.forEach((h) => h(message.data))
          }

          // Auto-invalidate queries based on message type
          switch (message.type) {
            case 'notification':
              queryClient.invalidateQueries({ queryKey: ['notifications'] })
              break
            case 'shift_update':
              queryClient.invalidateQueries({ queryKey: ['shifts'] })
              queryClient.invalidateQueries({ queryKey: ['marketplace'] })
              break
            case 'application_update':
              queryClient.invalidateQueries({ queryKey: ['applications'] })
              queryClient.invalidateQueries({ queryKey: ['shifts'] })
              break
            case 'payment_update':
              queryClient.invalidateQueries({ queryKey: ['wallet'] })
              queryClient.invalidateQueries({ queryKey: ['transactions'] })
              break
          }
        } catch {
          if (import.meta.env.DEV) console.warn('Failed to parse WebSocket message:', event.data)
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to create WebSocket:', error)
      setConnectionState('disconnected')
    }
  }, [enabled, clearTimers, startPingPong, onConnect, onDisconnect, onError, queryClient])

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  // Effect to manage connection lifecycle
  useEffect(() => {
    const token = tokenManager.getAccessToken()
    if (enabled && token) {
      connect()
    }

    return () => {
      clearTimers()
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting')
        wsRef.current = null
      }
    }
  }, [enabled, connect, clearTimers])

  // Reconnect when token changes (e.g., after login)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'extrashifty_access_token') {
        if (e.newValue) {
          // Token was set, connect
          reconnect()
        } else {
          // Token was cleared, disconnect
          if (wsRef.current) {
            wsRef.current.close(1000, 'User logged out')
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [reconnect])

  return {
    subscribe,
    connectionState,
    isConnected: connectionState === 'connected',
    reconnect,
  }
}
