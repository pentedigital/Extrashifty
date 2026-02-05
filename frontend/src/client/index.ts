/**
 * API Client Configuration
 *
 * To generate the client from backend OpenAPI spec:
 * 1. Ensure backend is running: cd backend && uvicorn app.main:app --reload
 * 2. Generate client: npm run sync-api
 *
 * This will create typed clients in ./generated/
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

// Re-export generated types and SDK when available
// These exports will work once `npm run sync-api` has been run
export * from './generated'

// Token management
const TOKEN_KEY = 'extrashifty_access_token'
const REFRESH_TOKEN_KEY = 'extrashifty_refresh_token'

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

export const tokenManager = {
  getAccessToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken?: string): void => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
  },
  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
  hasTokens: (): boolean => !!localStorage.getItem(TOKEN_KEY),
}

// API Error types
export type ApiError = {
  detail: string
}

export type ValidationError = {
  loc: (string | number)[]
  msg: string
  type: string
}

export type HTTPValidationError = {
  detail: ValidationError[]
}

// Token response type
export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

// Refresh the access token
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

    const data: TokenResponse = await response.json()
    tokenManager.setTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    tokenManager.clearTokens()
    return null
  }
}

// Fetch wrapper with auth and automatic token refresh
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = tokenManager.getAccessToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

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
        return apiFetch<T>(endpoint, options, false)
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login'
        throw new Error('Session expired')
      }
    } else {
      // Wait for the refresh to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken: string) => {
          ;(headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
          fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })
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

// API methods
export const api = {
  auth: {
    login: async (email: string, password: string): Promise<TokenResponse> => {
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

      const data: TokenResponse = await response.json()
      tokenManager.setTokens(data.access_token, data.refresh_token)
      return data
    },
    refresh: async (): Promise<TokenResponse | null> => {
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

      const data: TokenResponse = await response.json()
      tokenManager.setTokens(data.access_token, data.refresh_token)
      return data
    },
    logout: (): void => {
      tokenManager.clearTokens()
      window.location.href = '/login'
    },
    register: (data: { email: string; password: string; full_name: string }) =>
      apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => apiFetch('/api/v1/auth/me'),
  },
  users: {
    getById: (id: string) => apiFetch(`/api/v1/users/${id}`),
    update: (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/v1/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  shifts: {
    list: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return apiFetch(`/api/v1/shifts${query}`)
    },
    getById: (id: string) => apiFetch(`/api/v1/shifts/${id}`),
    create: (data: Record<string, unknown>) =>
      apiFetch('/api/v1/shifts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/v1/shifts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch(`/api/v1/shifts/${id}`, {
        method: 'DELETE',
      }),
  },
  applications: {
    list: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return apiFetch(`/api/v1/applications${query}`)
    },
    create: (data: { shift_id: string; cover_message?: string }) =>
      apiFetch('/api/v1/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      apiFetch(`/api/v1/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
}
