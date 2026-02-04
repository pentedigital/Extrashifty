import { useState, useEffect, useCallback } from 'react'
import { api, tokenManager, ApiClientError } from '@/lib/api'
import type { User, UserType } from '@/types/user'

interface UseAuthReturn {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  userType: UserType | null
  isStaff: boolean
  isCompany: boolean
  isAgency: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    full_name: string
    user_type: UserType
  }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  clearError: () => void
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = !!user
  const userType = user?.user_type ?? null
  const isStaff = userType === 'staff'
  const isCompany = userType === 'company'
  const isAgency = userType === 'agency'
  const isAdmin = userType === 'admin'
  const isSuperAdmin = userType === 'super_admin'

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!tokenManager.hasTokens()) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const userData = await api.auth.me()
      setUser(userData)
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        tokenManager.clearTokens()
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.auth.login(email, password)
      tokenManager.setTokens(response.access_token, response.refresh_token)
      setUser(response.user)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(
    async (data: {
      email: string
      password: string
      full_name: string
      user_type: UserType
    }) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await api.auth.register(data)
        tokenManager.setTokens(response.access_token, response.refresh_token)
        setUser(response.user)
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message)
        } else {
          setError('An unexpected error occurred')
        }
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const logout = useCallback(() => {
    tokenManager.clearTokens()
    setUser(null)
    setError(null)
  }, [])

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    userType,
    isStaff,
    isCompany,
    isAgency,
    isAdmin,
    isSuperAdmin,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  }
}
