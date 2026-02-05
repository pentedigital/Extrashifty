import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StaffProfile } from '@/types/staff'

export const staffKeys = {
  all: ['staff'] as const,
  profile: () => [...staffKeys.all, 'profile'] as const,
  shifts: (filters?: Record<string, string>) => [...staffKeys.all, 'shifts', filters] as const,
  myShifts: (filters?: Record<string, string>) => [...staffKeys.all, 'my-shifts', filters] as const,
  stats: () => [...staffKeys.all, 'stats'] as const,
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

/**
 * Hook to fetch the logged-in staff member's assigned/confirmed shifts.
 * These are shifts where the staff has an accepted application.
 */
export function useMyShifts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.myShifts(filters),
    queryFn: () => api.shifts.getMyShifts(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to fetch dashboard stats for the logged-in staff member.
 * Returns counts of upcoming shifts, pending applications, earnings, rating, etc.
 */
export function useMyStats() {
  return useQuery({
    queryKey: staffKeys.stats(),
    queryFn: () => api.users.getStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
