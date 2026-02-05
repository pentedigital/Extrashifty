/**
 * API Client Wrapper
 *
 * This module wraps the OpenAPI-TS generated client with:
 * - Base URL configuration from environment
 * - Automatic auth token injection
 * - Token refresh handling
 *
 * Usage:
 *   import { apiClient, configureClient } from '@/lib/apiClient'
 *   import type { ShiftRead, ApplicationRead } from '@/client/generated'
 *
 *   // Configure once at app startup
 *   configureClient()
 *
 *   // Use the configured client
 *   const shifts = await apiClient.getShifts()
 */

import { tokenManager, API_BASE_URL } from '@/client'
import type {
  ShiftRead,
  ShiftCreate,
  ShiftUpdate,
  ApplicationRead,
  ApplicationCreate,
  UserRead,
  PaginatedResponse,
  Token,
} from '@/client/generated'

// Re-export types for convenience
export type {
  ShiftRead,
  ShiftCreate,
  ShiftUpdate,
  ApplicationRead,
  ApplicationCreate,
  UserRead,
  PaginatedResponse,
  Token,
}

// Client configuration state
let clientConfigured = false
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenManager.getRefreshToken()
  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      tokenManager.clearTokens()
      return null
    }

    const data: Token = await response.json()
    tokenManager.setTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    tokenManager.clearTokens()
    return null
  }
}

/**
 * Create request headers with auth token
 */
function createHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  }

  const token = tokenManager.getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

/**
 * Make an authenticated API request with automatic token refresh
 */
async function authenticatedFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers = createHeaders(options.headers as Record<string, string>)

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle 401 - try to refresh token
  if (response.status === 401 && retry) {
    if (!isRefreshing) {
      isRefreshing = true

      const newToken = await refreshAccessToken()

      isRefreshing = false

      if (newToken) {
        onTokenRefreshed(newToken)
        // Retry the original request with new token
        return authenticatedFetch<T>(endpoint, options, false)
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login'
        throw new Error('Session expired')
      }
    } else {
      // Wait for the refresh to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken: string) => {
          const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` }
          fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers: retryHeaders })
            .then((res) => {
              if (!res.ok) {
                reject(new Error('Request failed after token refresh'))
              }
              return res.json()
            })
            .then(resolve)
            .catch(reject)
        })
      })
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

/**
 * Configure the API client
 * Call this once at app initialization (e.g., in main.tsx)
 */
export function configureClient(): void {
  if (clientConfigured) {
    return
  }

  // When the generated client is available, configure it here:
  // import { client } from '@/client/generated'
  // client.setConfig({
  //   baseUrl: API_BASE_URL,
  // })
  //
  // client.interceptors.request.use((request) => {
  //   const token = tokenManager.getAccessToken()
  //   if (token) {
  //     request.headers.set('Authorization', `Bearer ${token}`)
  //   }
  //   return request
  // })

  clientConfigured = true
}

/**
 * Type-safe API client using generated types
 *
 * This provides a typed interface that will use the generated SDK
 * once it's available, while falling back to manual fetch for now.
 */
export const apiClient = {
  // Auth endpoints
  auth: {
    login: async (email: string, password: string): Promise<Token> => {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Login failed' }))
        throw new Error(error.detail || 'Login failed')
      }

      const data: Token = await response.json()
      tokenManager.setTokens(data.access_token, data.refresh_token)
      return data
    },

    logout: (): void => {
      tokenManager.clearTokens()
      window.location.href = '/login'
    },

    me: (): Promise<UserRead> => {
      return authenticatedFetch<UserRead>('/api/v1/auth/me')
    },

    refresh: async (): Promise<Token | null> => {
      const refreshToken = tokenManager.getRefreshToken()
      if (!refreshToken) return null

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        tokenManager.clearTokens()
        return null
      }

      const data: Token = await response.json()
      tokenManager.setTokens(data.access_token, data.refresh_token)
      return data
    },
  },

  // Shifts endpoints
  shifts: {
    list: (params?: Record<string, string>): Promise<PaginatedResponse<ShiftRead>> => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return authenticatedFetch<PaginatedResponse<ShiftRead>>(`/api/v1/shifts${query}`)
    },

    get: (id: string | number): Promise<ShiftRead> => {
      return authenticatedFetch<ShiftRead>(`/api/v1/shifts/${id}`)
    },

    create: (data: ShiftCreate): Promise<ShiftRead> => {
      return authenticatedFetch<ShiftRead>('/api/v1/shifts', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    update: (id: string | number, data: ShiftUpdate): Promise<ShiftRead> => {
      return authenticatedFetch<ShiftRead>(`/api/v1/shifts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    delete: (id: string | number): Promise<void> => {
      return authenticatedFetch<void>(`/api/v1/shifts/${id}`, {
        method: 'DELETE',
      })
    },

    getMyShifts: (params?: Record<string, string>): Promise<ShiftRead[]> => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return authenticatedFetch<ShiftRead[]>(`/api/v1/shifts/my-shifts${query}`)
    },

    apply: (
      shiftId: string | number,
      coverMessage?: string
    ): Promise<{ id: number; status: string; message: string }> => {
      return authenticatedFetch<{ id: number; status: string; message: string }>(
        `/api/v1/shifts/${shiftId}/apply`,
        {
          method: 'POST',
          body: JSON.stringify({ cover_message: coverMessage }),
        }
      )
    },
  },

  // Applications endpoints
  applications: {
    list: (params?: Record<string, string>): Promise<PaginatedResponse<ApplicationRead>> => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return authenticatedFetch<PaginatedResponse<ApplicationRead>>(`/api/v1/applications${query}`)
    },

    create: (data: ApplicationCreate): Promise<ApplicationRead> => {
      return authenticatedFetch<ApplicationRead>('/api/v1/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    updateStatus: (
      id: string | number,
      status: 'accepted' | 'rejected' | 'withdrawn'
    ): Promise<ApplicationRead> => {
      return authenticatedFetch<ApplicationRead>(`/api/v1/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    },
  },

  // Users endpoints
  users: {
    update: (data: Partial<UserRead>): Promise<UserRead> => {
      return authenticatedFetch<UserRead>('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    getPublicProfile: (
      userId: string | number
    ): Promise<{
      id: number
      full_name: string
      user_type: 'staff' | 'company' | 'agency'
      is_verified: boolean
      created_at: string
    }> => {
      return authenticatedFetch(`/api/v1/users/${userId}/public`)
    },
  },
}

// Default export for convenience
export default apiClient
