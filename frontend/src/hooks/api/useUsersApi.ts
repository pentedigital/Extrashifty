import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAppStore } from '@/stores/app'
import { authKeys } from './useAuthApi'
import type { User } from '@/types/user'

export const usersKeys = {
  all: ['users'] as const,
  publicProfile: (userId: string) => [...usersKeys.all, 'public', userId] as const,
}

interface UpdateProfileData {
  full_name?: string
  email?: string
  avatar_url?: string
}

interface ChangePasswordData {
  current_password: string
  new_password: string
}

/**
 * Hook to update the current user's profile
 * Updates name, email, and avatar
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const setUser = useAppStore((state) => state.setUser)

  return useMutation({
    mutationFn: (data: UpdateProfileData) => api.users.update(data),
    onSuccess: (updatedUser) => {
      // Update the user in the global store
      setUser(updatedUser)
      // Update the cached user data
      queryClient.setQueryData(authKeys.me(), updatedUser)
    },
  })
}

/**
 * Hook to change the current user's password
 * Requires current password for verification
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordData) => api.users.updatePassword(data),
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Password change failed:', error)
    },
  })
}

/**
 * Hook to delete (deactivate) the current user's account
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient()
  const logout = useAppStore((state) => state.logout)

  return useMutation({
    mutationFn: () => api.users.delete(),
    onSuccess: () => {
      logout()
      queryClient.clear()
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Account deletion failed:', error)
    },
  })
}

/**
 * Hook to fetch a user's public profile
 * Returns limited information suitable for public display
 */
export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: usersKeys.publicProfile(userId || ''),
    queryFn: () => api.users.getPublicProfile(userId!),
    enabled: !!userId,
  })
}
