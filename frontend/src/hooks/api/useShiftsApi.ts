import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import { api } from '@/lib/api'
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
    staleTime: 1000 * 60 * 2, // 2 minutes
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
 * Hook to fetch current user's shifts
 * Returns array of ShiftRead
 */
export function useMyShifts(params?: Record<string, string>) {
  return useQuery({
    queryKey: [...shiftKeys.all, 'my-shifts', params] as const,
    queryFn: () => apiClient.shifts.getMyShifts(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}
