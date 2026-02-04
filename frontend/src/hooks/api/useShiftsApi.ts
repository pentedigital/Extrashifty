import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Shift, ShiftFilters } from '@/types/shift'

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

export function useShifts(filters?: ShiftFilters) {
  return useQuery({
    queryKey: shiftKeys.list(filters),
    queryFn: () => api.shifts.list(filtersToParams(filters)),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useShift(id: string) {
  return useQuery({
    queryKey: shiftKeys.detail(id),
    queryFn: () => api.shifts.get(id),
    enabled: !!id,
  })
}

export function useCompanyShifts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: shiftKeys.companyList(filters),
    queryFn: () => api.company.getShifts(filters),
  })
}

export function useCreateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Shift>) => api.shifts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shiftKeys.company() })
    },
  })
}

export function useUpdateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Shift> }) =>
      api.shifts.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shiftKeys.company() })
    },
  })
}

export function useDeleteShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.shifts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shiftKeys.company() })
    },
  })
}
