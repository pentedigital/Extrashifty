import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApplicationStatus } from '@/types/application'
import { shiftKeys } from './useShiftsApi'

export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (filters?: Record<string, string>) => [...applicationKeys.lists(), filters] as const,
  forShift: (shiftId: string) => [...applicationKeys.all, 'shift', shiftId] as const,
}

export function useApplications(filters?: Record<string, string>) {
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () => api.applications.list(filters),
  })
}

/**
 * Hook to fetch the current user's applications.
 * For staff users, the backend automatically filters to only their applications.
 */
export function useMyApplications(status?: string) {
  const filters: Record<string, string> = {}
  if (status) {
    filters.status = status
  }
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () => api.applications.list(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useShiftApplicants(shiftId: string) {
  return useQuery({
    queryKey: applicationKeys.forShift(shiftId),
    queryFn: async () => {
      const applications = await api.company.getApplicants(shiftId)
      // Wrap array response in {items, total} format for consistency
      return { items: applications, total: applications.length }
    },
    enabled: !!shiftId,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { shift_id: string; cover_message?: string }) =>
      api.applications.create(data),
    onSuccess: (_, { shift_id }) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: applicationKeys.forShift(shift_id) })
      queryClient.invalidateQueries({ queryKey: shiftKeys.detail(shift_id) })
    },
  })
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      api.applications.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all })
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() })
    },
  })
}
