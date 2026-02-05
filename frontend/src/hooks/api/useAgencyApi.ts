import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AgencyProfile, AgencyStaffMember, AgencyClient, StaffAssignment } from '@/types/agency'

export const agencyKeys = {
  all: ['agency'] as const,
  profile: () => [...agencyKeys.all, 'profile'] as const,
  staff: (filters?: Record<string, string>) => [...agencyKeys.all, 'staff', filters] as const,
  clients: (filters?: Record<string, string>) => [...agencyKeys.all, 'clients', filters] as const,
  assignments: (filters?: Record<string, string>) => [...agencyKeys.all, 'assignments', filters] as const,
  invoices: (filters?: Record<string, string>) => [...agencyKeys.all, 'invoices', filters] as const,
  payroll: (filters?: Record<string, string>) => [...agencyKeys.all, 'payroll', filters] as const,
  wallet: () => [...agencyKeys.all, 'wallet'] as const,
  stats: () => [...agencyKeys.all, 'stats'] as const,
}

// Profile
export function useAgencyProfile() {
  return useQuery({
    queryKey: agencyKeys.profile(),
    queryFn: () => api.agency.getProfile(),
  })
}

export function useUpdateAgencyProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<AgencyProfile>) => api.agency.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.profile() })
    },
  })
}

// Staff Management
export function useAgencyStaff(filters?: Record<string, string>) {
  return useQuery({
    queryKey: agencyKeys.staff(filters),
    queryFn: () => api.agency.getStaff(filters),
  })
}

export function useInviteStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { emails: string[]; message?: string }) => api.agency.inviteStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.staff() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}

export function useRemoveStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.agency.removeStaffMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.staff() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}

export function useUpdateStaffMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AgencyStaffMember> }) =>
      api.agency.updateStaffMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.staff() })
    },
  })
}

// Client Management
export function useAgencyClients(filters?: Record<string, string>) {
  return useQuery({
    queryKey: agencyKeys.clients(filters),
    queryFn: () => api.agency.getClients(filters),
  })
}

export function useAddClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { business_email: string; billing_rate_markup?: number; notes?: string }) =>
      api.agency.addClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.clients() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AgencyClient> }) =>
      api.agency.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.clients() })
    },
  })
}

// Assignments
export function useAgencyAssignments(filters?: Record<string, string>) {
  return useQuery({
    queryKey: agencyKeys.assignments(filters),
    queryFn: () => api.agency.getAssignments(filters),
  })
}

export function useCreateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { shift_id: string; staff_member_id: string }) =>
      api.agency.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.assignments() })
    },
  })
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffAssignment> }) =>
      api.agency.updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.assignments() })
    },
  })
}

// Billing
export function useAgencyInvoices(filters?: Record<string, string>) {
  return useQuery({
    queryKey: agencyKeys.invoices(filters),
    queryFn: () => api.agency.getInvoices(filters),
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { client_id: string; period_start: string; period_end: string }) =>
      api.agency.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.invoices() })
    },
  })
}

export function useAgencyPayroll(filters?: Record<string, string>) {
  return useQuery({
    queryKey: agencyKeys.payroll(filters),
    queryFn: () => api.agency.getPayroll(filters),
  })
}

export function useAgencyWallet() {
  return useQuery({
    queryKey: agencyKeys.wallet(),
    queryFn: () => api.agency.getWallet(),
  })
}

// Stats
export function useAgencyStats() {
  return useQuery({
    queryKey: agencyKeys.stats(),
    queryFn: () => api.agency.getStats(),
  })
}
