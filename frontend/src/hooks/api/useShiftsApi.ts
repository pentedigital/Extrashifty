import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import { api } from '@/lib/api'
import { STALE_TIME } from '@/constants/queryConfig'
import type { ShiftRead, ShiftCreate, ShiftUpdate } from '@/lib/apiClient'

// Re-export types for consumers of this hook
export type { ShiftRead, ShiftCreate, ShiftUpdate }

// Filter types that match the generated types
export interface ShiftFilters {
  search?: string
  city?: string
  shift_type?: string
  min_rate?: number
  max_rate?: number
  date_from?: string
  date_to?: string
  status?: string
}

export const shiftKeys = {
  all: ['shifts'] as const,
  lists: () => [...shiftKeys.all, 'list'] as const,
  list: (filters?: ShiftFilters) => [...shiftKeys.lists(), filters] as const,
  details: () => [...shiftKeys.all, 'detail'] as const,
  detail: (id: string) => [...shiftKeys.details(), id] as const,
  company: () => [...shiftKeys.all, 'company'] as const,
  companyList: (filters?: Record<string, string>) => [...shiftKeys.company(), 'list', filters] as const,
}

// Convert ShiftFilters to API params
function filtersToParams(filters?: ShiftFilters): Record<string, string> {
  if (!filters) return {}

  const params: Record<string, string> = {}
  if (filters.search) params.search = filters.search
  if (filters.city) params.city = filters.city
  if (filters.shift_type) params.shift_type = filters.shift_type
  if (filters.min_rate) params.min_rate = String(filters.min_rate)
  if (filters.max_rate) params.max_rate = String(filters.max_rate)
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to
  if (filters.status) params.status = filters.status

  return params
}

/**
 * Hook to fetch paginated shifts list
 * Uses generated ShiftRead type from OpenAPI spec
 */
export function useShifts(filters?: ShiftFilters) {
  return useQuery({
    queryKey: shiftKeys.list(filters),
    queryFn: () => apiClient.shifts.list(filtersToParams(filters)),
    staleTime: STALE_TIME.SHORT,
  })
}

/**
 * Hook to fetch a single shift by ID
 * Returns typed ShiftRead from generated client
 */
export function useShift(id: string) {
  return useQuery({
    queryKey: shiftKeys.detail(id),
    queryFn: () => apiClient.shifts.get(id),
    enabled: !!id,
  })
}

/**
 * Hook to fetch company's own shifts
 * Note: This uses the legacy api for now until company endpoints are in apiClient
 */
export function useCompanyShifts(filters?: Record<string, string>) {
  // Uses legacy api for company-specific endpoints
  // These will be migrated to apiClient when the generated SDK is available
  return useQuery({
    queryKey: shiftKeys.companyList(filters),
    queryFn: () => api.company.getShifts(filters),
  })
}

/**
 * Hook to create a new shift
 * Uses generated ShiftCreate type for input validation
 */
export function useCreateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ShiftCreate) => apiClient.shifts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shiftKeys.company() })
    },
  })
}

/**
 * Hook to update an existing shift
 * Uses generated ShiftUpdate type for partial updates
 */
export function useUpdateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShiftUpdate }) =>
      apiClient.shifts.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shiftKeys.company() })
    },
  })
}

/**
 * Hook to delete a shift
 */
export function useDeleteShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.shifts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shiftKeys.company() })
    },
  })
}

/**
 * Hook to apply to a shift
 */
export function useApplyToShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, coverMessage }: { shiftId: string; coverMessage?: string }) =>
      apiClient.shifts.apply(shiftId, coverMessage),
    onSuccess: (_, { shiftId }) => {
      // Invalidate the specific shift to reflect application status
      queryClient.invalidateQueries({ queryKey: shiftKeys.detail(shiftId) })
      // Invalidate shift lists
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() })
      // Invalidate applications list
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

/**
 * @deprecated Use useMyShifts from useStaffApi.ts instead.
 *
 * This version is kept for backward compatibility only.
 * The canonical version in useStaffApi.ts uses consistent query keys with
 * other staff-related hooks and proper cache invalidation.
 *
 * Migration: Replace imports from './useShiftsApi' with './useStaffApi'
 * Example: import { useMyShifts } from '@/hooks/api/useStaffApi'
 */
export function useMyShifts(params?: Record<string, string>) {
  return useQuery({
    queryKey: [...shiftKeys.all, 'my-shifts', params] as const,
    queryFn: () => apiClient.shifts.getMyShifts(params),
    staleTime: STALE_TIME.SHORT,
  })
}

/**
 * @deprecated Use useClockRecords from useStaffApi.ts instead.
 *
 * This version is kept for backward compatibility only.
 * The canonical version in useStaffApi.ts uses consistent query keys with
 * other staff-related hooks and proper cache invalidation.
 *
 * Migration: Replace imports from './useShiftsApi' with './useStaffApi'
 * Example: import { useClockRecords } from '@/hooks/api/useStaffApi'
 */
export function useClockRecords(params?: Record<string, string>) {
  return useQuery({
    queryKey: [...shiftKeys.all, 'clock-records', params] as const,
    queryFn: () => api.staff.getClockRecords(params),
    staleTime: STALE_TIME.SHORT,
  })
}

/**
 * Hook to get current shift status (is user clocked in?)
 */
export function useCurrentShiftStatus() {
  return useQuery({
    queryKey: [...shiftKeys.all, 'current-shift-status'] as const,
    queryFn: async () => {
      // Check if there's an active clock-in by looking at recent records
      const records = await api.staff.getClockRecords({ limit: '1', status: 'clocked_in' })
      if (records.items && records.items.length > 0) {
        const activeRecord = records.items[0]
        return {
          clocked_in: true,
          shift_id: String(activeRecord.shift_id),
          clock_record: activeRecord,
        }
      }
      return { clocked_in: false }
    },
    staleTime: STALE_TIME.REALTIME, // 30 seconds - for live time tracking data
  })
}

/**
 * Hook to clock in to a shift
 */
export function useClockIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { shift_id: number; notes?: string }) => api.staff.clockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...shiftKeys.all, 'clock-records'] })
      queryClient.invalidateQueries({ queryKey: [...shiftKeys.all, 'current-shift-status'] })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Clock in failed:', error)
    },
  })
}

/**
 * Hook to clock out from a shift
 */
export function useClockOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { shift_id: number; notes?: string }) => api.staff.clockOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...shiftKeys.all, 'clock-records'] })
      queryClient.invalidateQueries({ queryKey: [...shiftKeys.all, 'current-shift-status'] })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Clock out failed:', error)
    },
  })
}
