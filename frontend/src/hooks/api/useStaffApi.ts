import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StaffProfile } from '@/types/staff'

export const staffKeys = {
  all: ['staff'] as const,
  profile: () => [...staffKeys.all, 'profile'] as const,
  shifts: (filters?: Record<string, string>) => [...staffKeys.all, 'shifts', filters] as const,
  wallet: () => [...staffKeys.all, 'wallet'] as const,
  clockRecords: (filters?: Record<string, string>) => [...staffKeys.all, 'clock', filters] as const,
}

export function useStaffProfile() {
  return useQuery({
    queryKey: staffKeys.profile(),
    queryFn: () => api.staff.getProfile(),
  })
}

export function useUpdateStaffProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<StaffProfile>) => api.staff.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.profile() })
    },
  })
}

export function useStaffShifts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.shifts(filters),
    queryFn: () => api.staff.getShifts(filters),
  })
}

export function useStaffWallet() {
  return useQuery({
    queryKey: staffKeys.wallet(),
    queryFn: () => api.staff.getWallet(),
  })
}

export function useClockRecords(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.clockRecords(filters),
    queryFn: () => api.staff.getClockRecords(filters),
  })
}
