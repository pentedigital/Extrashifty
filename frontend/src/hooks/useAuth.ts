import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCurrentUser, useLogin, useRegister, useLogout } from './api/useAuthApi'
import { tokenManager } from '@/lib/api'
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
  login: (email: string, password: string) => Promise<User>
  register: (data: {
    email: string
    password: string
    full_name: string
    user_type: UserType
  }) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<void>
  clearError: () => void
}

export function useAuth(): UseAuthReturn {
  const navigate = useNavigate()

  // React Query hooks
  const { data: user, isLoading: isLoadingUser, error: userError, refetch } = useCurrentUser()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const logoutMutation = useLogout()

  const isAuthenticated = !!user
  const userType = user?.user_type ?? null
  const isStaff = userType === 'staff'
  const isCompany = userType === 'company'
  const isAgency = userType === 'agency'
  const isAdmin = userType === 'admin'
  const isSuperAdmin = userType === 'super_admin'

  // Combine loading states
  const isLoading = isLoadingUser || loginMutation.isPending || registerMutation.isPending

  // Get error message from any pending mutation or user query
  const error =
    loginMutation.error?.message ||
    registerMutation.error?.message ||
    (userError?.message && tokenManager.hasTokens() ? userError.message : null)

  const clearError = useCallback(() => {
    loginMutation.reset()
    registerMutation.reset()
  }, [loginMutation, registerMutation])

  const refreshUser = useCallback(async () => {
    if (tokenManager.hasTokens()) {
      await refetch()
    }
  }, [refetch])

  const login = useCallback(
    async (email: string, password: string) => {
      const user = await loginMutation.mutateAsync({ email, password })
      return user
    },
    [loginMutation]
  )

  const register = useCallback(
    async (data: {
      email: string
      password: string
      full_name: string
      user_type: UserType
    }) => {
      const user = await registerMutation.mutateAsync(data)
      return user
    },
    [registerMutation]
  )

  const logout = useCallback(() => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate({ to: '/login' })
      },
    })
  }, [logoutMutation, navigate])

  return {
    user: user ?? null,
    isAuthenticated,
    isLoading,
    error: error ?? null,
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
