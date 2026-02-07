import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { STALE_TIME } from '@/constants/queryConfig'

export interface MarketplaceSearchFilters {
  location?: string
  job_type?: string
  min_pay?: number
  max_pay?: number
  date_from?: string
  date_to?: string
  skills?: string
  search?: string
  skip?: number
  limit?: number
}

export const marketplaceKeys = {
  all: ['marketplace'] as const,
  shifts: () => [...marketplaceKeys.all, 'shifts'] as const,
  shiftsList: (params?: Record<string, string>) => [...marketplaceKeys.shifts(), 'list', params] as const,
  shiftsSearch: (filters?: MarketplaceSearchFilters) => [...marketplaceKeys.shifts(), 'search', filters] as const,
  shiftDetail: (id: string) => [...marketplaceKeys.shifts(), 'detail', id] as const,
  stats: () => [...marketplaceKeys.all, 'stats'] as const,
}

export function useMarketplaceShifts(params?: Record<string, string>) {
  return useQuery({
    queryKey: marketplaceKeys.shiftsList(params),
    queryFn: () => api.marketplace.listShifts(params),
    staleTime: STALE_TIME.SHORT,
  })
}

export function useMarketplaceSearch(filters?: MarketplaceSearchFilters) {
  return useQuery({
    queryKey: marketplaceKeys.shiftsSearch(filters),
    queryFn: () => api.marketplace.searchShifts(filters),
    staleTime: STALE_TIME.SHORT,
  })
}

export function useMarketplaceShift(id: string) {
  return useQuery({
    queryKey: marketplaceKeys.shiftDetail(id),
    queryFn: () => api.marketplace.getShift(id),
    enabled: !!id,
    staleTime: STALE_TIME.SHORT,
  })
}

export function useMarketplaceStats() {
  return useQuery({
    queryKey: marketplaceKeys.stats(),
    queryFn: () => api.marketplace.getStats(),
    staleTime: STALE_TIME.MEDIUM,
  })
}
