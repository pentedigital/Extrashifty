import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CompanyProfile, VenueFormData } from '@/types/company'
import type { ShiftFormData } from '@/types/shift'

export const companyKeys = {
  all: ['company'] as const,
  profile: () => [...companyKeys.all, 'profile'] as const,
  shifts: (filters?: Record<string, string>) => [...companyKeys.all, 'shifts', filters] as const,
  shift: (id: string) => [...companyKeys.all, 'shift', id] as const,
  shiftApplications: (shiftId: string) => [...companyKeys.all, 'shifts', shiftId, 'applications'] as const,
  wallet: () => [...companyKeys.all, 'wallet'] as const,
  venues: () => [...companyKeys.all, 'venues'] as const,
  spending: (filters?: Record<string, string>) => [...companyKeys.all, 'spending', filters] as const,
  reviews: (filters?: Record<string, string>) => [...companyKeys.all, 'reviews', filters] as const,
  stats: () => [...companyKeys.all, 'stats'] as const,
  preferredAgencies: () => [...companyKeys.all, 'preferred-agencies'] as const,
  browseAgencies: (params?: { search?: string }) => [...companyKeys.all, 'browse-agencies', params] as const,
}

// ============================================================================
// Profile Hooks
// ============================================================================

export function useCompanyProfile() {
  return useQuery({
    queryKey: companyKeys.profile(),
    queryFn: () => api.company.getProfile(),
  })
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<CompanyProfile>) => api.company.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.profile() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to update company profile:', error)
    },
  })
}

// ============================================================================
// Wallet Hooks
// ============================================================================

export function useCompanyWallet() {
  return useQuery({
    queryKey: companyKeys.wallet(),
    queryFn: () => api.company.getWallet(),
  })
}

// ============================================================================
// Venue Hooks
// ============================================================================

export function useCompanyVenues() {
  return useQuery({
    queryKey: companyKeys.venues(),
    queryFn: () => api.company.getVenues(),
  })
}

export function useCreateVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: VenueFormData) => api.company.createVenue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.venues() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to create venue:', error)
    },
  })
}

export function useUpdateVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VenueFormData> }) =>
      api.company.updateVenue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.venues() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to update venue:', error)
    },
  })
}

export function useDeleteVenue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.company.deleteVenue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.venues() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to delete venue:', error)
    },
  })
}

// ============================================================================
// Shift Hooks
// ============================================================================

export function useCompanyShifts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: companyKeys.shifts(filters),
    queryFn: () => api.company.getShifts(filters),
  })
}

export function useCreateCompanyShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ShiftFormData) => api.company.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.shifts() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to create shift:', error)
    },
  })
}

export function useUpdateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShiftFormData> }) =>
      api.company.updateShift(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.shifts() })
      queryClient.invalidateQueries({ queryKey: companyKeys.shift(variables.id) })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to update shift:', error)
    },
  })
}

export function useDeleteShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.company.deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.shifts() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to delete shift:', error)
    },
  })
}

// ============================================================================
// Application Hooks
// ============================================================================

export function useShiftApplications(shiftId: string) {
  return useQuery({
    queryKey: companyKeys.shiftApplications(shiftId),
    queryFn: () => api.company.getShiftApplications(shiftId),
    enabled: !!shiftId,
  })
}

export function useAcceptApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (applicationId: string) => api.company.acceptApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to accept application:', error)
    },
  })
}

export function useRejectApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (applicationId: string) => api.company.rejectApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to reject application:', error)
    },
  })
}

// ============================================================================
// Spending Hooks
// ============================================================================

export function useCompanySpending(filters?: Record<string, string>) {
  return useQuery({
    queryKey: companyKeys.spending(filters),
    queryFn: () => api.company.getSpending(filters),
  })
}

// ============================================================================
// Review Hooks
// ============================================================================

export function useCompanyReviews(filters?: Record<string, string>) {
  return useQuery({
    queryKey: companyKeys.reviews(filters),
    queryFn: () => api.company.getReviews(filters),
  })
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { shift_id: number; worker_id: number; rating: number; comment?: string }) =>
      api.company.createReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.reviews() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to create review:', error)
    },
  })
}

// ============================================================================
// Stats Hooks
// ============================================================================

export function useCompanyStats() {
  return useQuery({
    queryKey: companyKeys.stats(),
    queryFn: () => api.company.getStats(),
  })
}

// ============================================================================
// Preferred Agencies Hooks
// ============================================================================

export function usePreferredAgencies() {
  return useQuery({
    queryKey: companyKeys.preferredAgencies(),
    queryFn: () => api.company.getPreferredAgencies(),
  })
}

export function useBrowseAgencies(params?: { search?: string; skip?: number; limit?: number }) {
  return useQuery({
    queryKey: companyKeys.browseAgencies(params),
    queryFn: () => api.company.browseAgencies(params),
  })
}

export function useAddPreferredAgency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (agencyId: number) => api.company.addPreferredAgency(agencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.preferredAgencies() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to add preferred agency:', error)
    },
  })
}

export function useRemovePreferredAgency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (agencyId: number) => api.company.removePreferredAgency(agencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.preferredAgencies() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to remove preferred agency:', error)
    },
  })
}
