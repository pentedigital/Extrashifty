import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: { skip?: number; limit?: number; unread_only?: boolean }) =>
    [...notificationKeys.lists(), params] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
}

export interface Notification {
  id: number
  user_id: number
  type: string
  title: string
  message: string
  is_read: boolean
  data: Record<string, unknown> | null
  created_at: string
}

export interface NotificationPreferences {
  id: number
  user_id: number
  email_enabled: boolean
  push_enabled: boolean
  shift_updates: boolean
  payment_updates: boolean
  marketing: boolean
}

export function useNotifications(params?: { skip?: number; limit?: number; unread_only?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => api.notifications.list(params),
    staleTime: 1000 * 30, // 30 seconds
  })
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => api.notifications.getPreferences(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: number) => api.notifications.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: number) => api.notifications.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      email_enabled?: boolean
      push_enabled?: boolean
      shift_updates?: boolean
      payment_updates?: boolean
      marketing?: boolean
    }) => api.notifications.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() })
    },
  })
}
