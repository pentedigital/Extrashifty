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
  applications: (filters?: Record<string, string>) => [...staffKeys.all, 'applications', filters] as const,
  earnings: (filters?: Record<string, string>) => [...staffKeys.all, 'earnings', filters] as const,
  reviews: (filters?: Record<string, string>) => [...staffKeys.all, 'reviews', filters] as const,
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

/**
 * Hook to clock in for a shift.
 */
export function useClockIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { shift_id: number; notes?: string }) => api.staff.clockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.clockRecords() })
      queryClient.invalidateQueries({ queryKey: staffKeys.shifts() })
    },
  })
}

/**
 * Hook to clock out from a shift.
 */
export function useClockOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { shift_id: number; notes?: string }) => api.staff.clockOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.clockRecords() })
      queryClient.invalidateQueries({ queryKey: staffKeys.shifts() })
    },
  })
}

/**
 * Hook to fetch the staff member's application history.
 */
export function useStaffApplications(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.applications(filters),
    queryFn: () => api.staff.getApplications(filters),
  })
}

/**
 * Hook to apply to a shift.
 */
export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { shift_id: number; cover_message?: string }) =>
      api.staff.createApplication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.applications() })
      queryClient.invalidateQueries({ queryKey: staffKeys.stats() })
    },
  })
}

/**
 * Hook to withdraw an application.
 */
export function useWithdrawApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (applicationId: number) => api.staff.withdrawApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.applications() })
      queryClient.invalidateQueries({ queryKey: staffKeys.stats() })
    },
  })
}

/**
 * Hook to fetch the staff member's earnings history.
 */
export function useStaffEarnings(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.earnings(filters),
    queryFn: () => api.staff.getEarnings(filters),
  })
}

/**
 * Hook to fetch reviews received by the staff member.
 */
export function useStaffReviews(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.reviews(filters),
    queryFn: () => api.staff.getReviews(filters),
  })
}
