import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AgencyProfile, AgencyStaffMember, AgencyClient, StaffAssignment, AgencyShift } from '@/types/agency'

export const agencyKeys = {
  all: ['agency'] as const,
  profile: () => [...agencyKeys.all, 'profile'] as const,
  staff: (filters?: Record<string, string>) => [...agencyKeys.all, 'staff', filters] as const,
  staffAvailability: (staffId: string) => [...agencyKeys.all, 'staff-availability', staffId] as const,
  clients: (filters?: Record<string, string>) => [...agencyKeys.all, 'clients', filters] as const,
  shifts: (filters?: Record<string, string>) => [...agencyKeys.all, 'shifts', filters] as const,
  applications: (filters?: Record<string, string>) => [...agencyKeys.all, 'applications', filters] as const,
  assignments: (filters?: Record<string, string>) => [...agencyKeys.all, 'assignments', filters] as const,
  invoices: (filters?: Record<string, string>) => [...agencyKeys.all, 'invoices', filters] as const,
  invoice: (id: string) => [...agencyKeys.all, 'invoice', id] as const,
  payroll: (filters?: Record<string, string>) => [...agencyKeys.all, 'payroll', filters] as const,
  payrollEntry: (id: string) => [...agencyKeys.all, 'payroll-entry', id] as const,
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
    mutationFn: ({ id, data }: { id: string; data: { status?: string; is_available?: boolean; notes?: string } }) =>
      api.agency.updateStaffMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.staff() })
    },
  })
}

export function useAddStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { staff_user_id: number; notes?: string; is_available?: boolean }) =>
      api.agency.addStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.staff() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}

export function useStaffAvailability(staffId: string) {
  return useQuery({
    queryKey: agencyKeys.staffAvailability(staffId),
    queryFn: () => api.agency.getStaffAvailability(staffId),
    enabled: !!staffId,
  })
}

export function useUpdateStaffAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ staffId, data }: { staffId: string; data: { is_available: boolean; notes?: string } }) =>
      api.agency.updateStaffAvailability(staffId, data),
    onSuccess: (_, { staffId }) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.staff() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.staffAvailability(staffId) })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
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
    mutationFn: ({ id, data }: { id: string; data: { billing_rate_markup?: number; notes?: string; is_active?: boolean } }) =>
      api.agency.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.clients() })
    },
  })
}

export function useRemoveClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.agency.removeClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.clients() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}

// Shift Management
export function useAgencyShifts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: agencyKeys.shifts(filters),
    queryFn: () => api.agency.getShifts(filters),
  })
}

export function useCreateAgencyShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      client_id: number
      title: string
      description?: string
      shift_type: string
      date: string
      start_time: string
      end_time: string
      hourly_rate: number
      location: string
      address?: string
      city: string
      spots_total?: number
      requirements?: Record<string, unknown>
    }) => api.agency.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.shifts() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}

export function useUpdateAgencyShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: {
      title?: string
      description?: string
      shift_type?: string
      date?: string
      start_time?: string
      end_time?: string
      hourly_rate?: number
      location?: string
      address?: string
      city?: string
      spots_total?: number
      status?: string
      requirements?: Record<string, unknown>
    }}) => api.agency.updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.shifts() })
    },
  })
}

export function useDeleteAgencyShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.agency.deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.shifts() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}

export function useAssignStaffToShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, staffMemberId }: { shiftId: string; staffMemberId: number }) =>
      api.agency.assignStaffToShift(shiftId, staffMemberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.shifts() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.staff() })
    },
  })
}

// Application Management
export function useAgencyApplications(filters?: Record<string, string>) {
  return useQuery({
    queryKey: agencyKeys.applications(filters),
    queryFn: () => api.agency.getApplications(filters),
  })
}

export function useAcceptApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (applicationId: string) => api.agency.acceptApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.applications() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.shifts() })
    },
  })
}

export function useRejectApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (applicationId: string) => api.agency.rejectApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.applications() })
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

// Billing - Invoices
export function useAgencyInvoices(filters?: Record<string, string>) {
  return useQuery({
    queryKey: agencyKeys.invoices(filters),
    queryFn: () => api.agency.getInvoices(filters),
  })
}

export function useAgencyInvoice(id: string) {
  return useQuery({
    queryKey: agencyKeys.invoice(id),
    queryFn: () => api.agency.getInvoice(id),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      client_id: number
      period_start: string
      period_end: string
      due_date: string
      amount: number
      currency?: string
      notes?: string
    }) => api.agency.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.invoices() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}

export function useSendInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.agency.sendInvoice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.invoices() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.invoice(id) })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.agency.markInvoicePaid(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.invoices() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.invoice(id) })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.wallet() })
    },
  })
}

// Billing - Payroll
export function useAgencyPayroll(filters?: Record<string, string>) {
  return useQuery({
    queryKey: agencyKeys.payroll(filters),
    queryFn: () => api.agency.getPayroll(filters),
  })
}

export function useAgencyPayrollEntry(id: string) {
  return useQuery({
    queryKey: agencyKeys.payrollEntry(id),
    queryFn: () => api.agency.getPayrollEntry(id),
    enabled: !!id,
  })
}

export function useProcessPayroll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      period_start: string
      period_end: string
      staff_member_ids?: number[]
    }) => api.agency.processPayroll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.payroll() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.wallet() })
    },
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
