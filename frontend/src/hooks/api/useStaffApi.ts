import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { STALE_TIME } from '@/constants/queryConfig'
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
    staleTime: STALE_TIME.LONG,
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
    staleTime: STALE_TIME.SHORT,
  })
}

export function useStaffWallet() {
  return useQuery({
    queryKey: staffKeys.wallet(),
    queryFn: () => api.staff.getWallet(),
    staleTime: STALE_TIME.REALTIME,
  })
}

/**
 * Hook to fetch time clock records for the logged-in staff member.
 *
 * CANONICAL LOCATION: This is the authoritative version of useClockRecords.
 * A deprecated version exists in useShiftsApi.ts for backward compatibility.
 *
 * Use this hook when:
 * - Displaying staff's clock in/out history
 * - Tracking time worked on shifts
 * - Viewing attendance records
 */
export function useClockRecords(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.clockRecords(filters),
    queryFn: () => api.staff.getClockRecords(filters),
    staleTime: STALE_TIME.REALTIME,
  })
}

/**
 * Hook to fetch the logged-in staff member's assigned/confirmed shifts.
 * These are shifts where the staff has an accepted application.
 *
 * CANONICAL LOCATION: This is the authoritative version of useMyShifts.
 * A deprecated version exists in useShiftsApi.ts for backward compatibility.
 *
 * Use this hook when:
 * - Displaying staff dashboard with upcoming shifts
 * - Showing "My Shifts" page for staff members
 * - Checking shifts the staff is confirmed to work
 */
export function useMyShifts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.myShifts(filters),
    queryFn: () => api.shifts.getMyShifts(filters),
    staleTime: STALE_TIME.SHORT,
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
    staleTime: STALE_TIME.MEDIUM,
  })
}

// NOTE: useClockIn and useClockOut are defined in useShiftsApi.ts
// with proper error handling and current-shift-status invalidation.
// Import them from useShiftsApi.ts instead.

/**
 * Hook to fetch the staff member's application history.
 */
export function useStaffApplications(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.applications(filters),
    queryFn: () => api.staff.getApplications(filters),
    staleTime: STALE_TIME.SHORT,
  })
}

/**
 * Hook to apply to a shift (staff-specific version).
 * Uses api.staff.createApplication with numeric shift_id.
 *
 * NOTE: For general application creation, prefer useCreateApplication from
 * useApplicationsApi.ts which uses api.applications.create with string shift_id.
 */
export function useStaffCreateApplication() {
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
    staleTime: STALE_TIME.SHORT,
  })
}

/**
 * Hook to fetch reviews received by the staff member.
 */
export function useStaffReviews(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.reviews(filters),
    queryFn: () => api.staff.getReviews(filters),
    staleTime: STALE_TIME.MEDIUM,
  })
}
