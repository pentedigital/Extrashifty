'use client'

import * as React from 'react'
import { Bell, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationDropdown } from './NotificationDropdown'
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/hooks/api/useNotificationsApi'
import { useWebSocketOptional } from '@/contexts'

// Fallback polling interval (only used when WebSocket is not connected)
const POLL_INTERVAL = 30000 // 30 seconds

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // WebSocket context for real-time updates
  const wsContext = useWebSocketOptional()
  const isWsConnected = wsContext?.isConnected ?? false

  // Fetch notifications with polling
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useNotifications({ limit: 10 })

  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllAsReadMutation = useMarkAllNotificationsAsRead()

  const notifications = notificationsData?.items ?? []
  const unreadCount = notificationsData?.unread_count ?? notifications.filter((n) => !n.is_read).length

  // Subscribe to real-time notification updates via WebSocket
  React.useEffect(() => {
    if (!wsContext) return

    const unsubscribe = wsContext.subscribe('notification', () => {
      // Refetch notifications when a new one arrives
      // The query is also auto-invalidated by the WebSocket context,
      // but this ensures immediate update
      refetch()
    })

    return unsubscribe
  }, [wsContext, refetch])

  // Fallback polling for notifications (only when WebSocket is not connected)
  React.useEffect(() => {
    // If WebSocket is connected, don't poll
    if (isWsConnected) return

    const interval = setInterval(() => {
      refetch()
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [refetch, isWsConnected])

  // Handle click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        title={isWsConnected ? 'Real-time updates active' : 'Using periodic refresh'}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px]"
            variant="default"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        {/* Show indicator when WebSocket is disconnected */}
        {!isWsConnected && wsContext && (
          <WifiOff className="absolute -bottom-1 -right-1 h-3 w-3 text-muted-foreground" />
        )}
      </Button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClose={handleClose}
          unreadCount={unreadCount}
        />
      )}
    </div>
  )
}
