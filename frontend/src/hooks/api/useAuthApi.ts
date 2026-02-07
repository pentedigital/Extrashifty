import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, tokenManager, ApiClientError } from '@/lib/api'
import { STALE_TIME } from '@/constants/queryConfig'
import { useAppStore } from '@/stores/app'
import type { UserType } from '@/types/user'

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  full_name: string
  user_type: UserType
}

export function useCurrentUser() {
  const setUser = useAppStore((state) => state.setUser)

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const user = await api.auth.me()
      setUser(user)
      return user
    },
    enabled: tokenManager.hasTokens(),
    retry: false,
    staleTime: STALE_TIME.LONG,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const setUser = useAppStore((state) => state.setUser)

  return useMutation({
    mutationFn: async ({ email, password }: LoginCredentials) => {
      // Backend expects form data for OAuth2 login
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1'}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Login failed' }))
        throw new ApiClientError(error.detail || 'Login failed', response.status, error)
      }

      const data = await response.json()
      tokenManager.setTokens(data.access_token, data.refresh_token)

      // Fetch user profile after login
      const user = await api.auth.me()
      return user
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(authKeys.me(), user)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  const setUser = useAppStore((state) => state.setUser)

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await api.auth.register(data)
      tokenManager.setTokens(response.access_token, response.refresh_token)
      return response.user
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(authKeys.me(), user)
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Registration failed:', error)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const logout = useAppStore((state) => state.logout)

  return useMutation({
    mutationFn: async () => {
      try {
        await api.auth.logout()
      } catch {
        // Ignore errors on logout
      }
      tokenManager.clearTokens()
    },
    onSuccess: () => {
      logout()
      queryClient.clear()
    },
  })
}
