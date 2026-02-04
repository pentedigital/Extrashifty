import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CompanyProfile, VenueFormData } from '@/types/company'

export const companyKeys = {
  all: ['company'] as const,
  profile: () => [...companyKeys.all, 'profile'] as const,
  shifts: (filters?: Record<string, string>) => [...companyKeys.all, 'shifts', filters] as const,
  wallet: () => [...companyKeys.all, 'wallet'] as const,
  venues: () => [...companyKeys.all, 'venues'] as const,
}

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
  })
}

export function useCompanyWallet() {
  return useQuery({
    queryKey: companyKeys.wallet(),
    queryFn: () => api.company.getWallet(),
  })
}

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
  })
}
