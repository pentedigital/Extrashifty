import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Note: Admin API endpoints should be added to the backend first
// This file provides the hooks structure for when the endpoints are available

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  users: (filters?: Record<string, string>) => [...adminKeys.all, 'users', filters] as const,
  admins: (filters?: Record<string, string>) => [...adminKeys.all, 'admins', filters] as const,
  companies: (filters?: Record<string, string>) => [...adminKeys.all, 'companies', filters] as const,
  agencies: (filters?: Record<string, string>) => [...adminKeys.all, 'agencies', filters] as const,
  shifts: (filters?: Record<string, string>) => [...adminKeys.all, 'shifts', filters] as const,
  transactions: (filters?: Record<string, string>) => [...adminKeys.all, 'transactions', filters] as const,
  payouts: (filters?: Record<string, string>) => [...adminKeys.all, 'payouts', filters] as const,
  auditLogs: (filters?: Record<string, string>) => [...adminKeys.all, 'audit-logs', filters] as const,
  reports: (filters?: Record<string, string>) => [...adminKeys.all, 'reports', filters] as const,
}

// Type definitions for admin data
export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalCompanies: number
  totalAgencies: number
  activeShifts: number
  shiftsThisWeek: number
  totalRevenue: number
  pendingPayouts: number
}

export interface AdminUser {
  id: number
  email: string
  full_name: string
  user_type: 'staff' | 'company' | 'agency' | 'admin' | 'super_admin'
  is_active: boolean
  is_verified: boolean
  created_at: string
  last_login?: string
}

export interface AdminCompany {
  id: number
  user_id: number
  business_name: string
  business_email: string
  is_verified: boolean
  created_at: string
  total_shifts: number
  total_spent: number
}

export interface AdminAgency {
  id: number
  user_id: number
  agency_name: string
  business_email: string
  is_verified: boolean
  created_at: string
  total_staff: number
  total_revenue: number
}

export interface AdminShift {
  id: number
  title: string
  company_name: string
  status: string
  date: string
  hourly_rate: number
  spots_total: number
  spots_filled: number
  created_at: string
}

export interface AdminTransaction {
  id: number
  type: string
  amount: number
  currency: string
  status: string
  description: string
  user_id: number
  user_email?: string
  created_at: string
}

export interface AdminPayout {
  id: number
  user_id: number
  user_name?: string
  amount: number
  status: string
  method: string
  created_at: string
  processed_at?: string
}

export interface AuditLogEntry {
  id: number
  action: string
  actor_id: number
  actor_email?: string
  target_type: string
  target_id?: number
  details: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface ReportData {
  period: string
  total_revenue: number
  total_shifts: number
  new_users: number
  active_users: number
  completion_rate: number
}

export interface PendingAction {
  id: string
  type: 'verification' | 'dispute' | 'payout' | 'company'
  count: number
  label: string
}

export interface RecentActivity {
  id: string
  type: string
  message: string
  time: string
}

// Dashboard Stats
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async (): Promise<{
      stats: AdminStats
      pendingActions: PendingAction[]
      recentActivity: RecentActivity[]
    }> => {
      // TODO: Replace with real API call when endpoint is available
      // return await api.admin.getStats()

      // For now, return empty/default data that will be replaced when API is ready
      return {
        stats: {
          totalUsers: 0,
          activeUsers: 0,
          totalCompanies: 0,
          totalAgencies: 0,
          activeShifts: 0,
          shiftsThisWeek: 0,
          totalRevenue: 0,
          pendingPayouts: 0,
        },
        pendingActions: [],
        recentActivity: [],
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Users Management
export function useAdminUsers(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: async (): Promise<{ items: AdminUser[]; total: number }> => {
      // TODO: Replace with real API call when endpoint is available
      // return await api.admin.getUsers(filters)
      return { items: [], total: 0 }
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: Partial<AdminUser> }) => {
      // TODO: Replace with real API call
      // return await api.admin.updateUser(userId, data)
      return { ...data, id: userId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
    },
    onError: (error) => {
      console.error('Failed to update user:', error)
    },
  })
}

export function useAdminDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: number) => {
      // TODO: Replace with real API call
      // return await api.admin.deleteUser(userId)
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
    onError: (error) => {
      console.error('Failed to delete user:', error)
    },
  })
}

// Admin Users Management
export function useAdminAdmins(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.admins(filters),
    queryFn: async (): Promise<{ items: AdminUser[]; total: number }> => {
      // TODO: Replace with real API call
      // return await api.admin.getAdmins(filters)
      return { items: [], total: 0 }
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useAdminCreateAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { email: string; full_name: string; password: string }) => {
      // TODO: Replace with real API call
      // return await api.admin.createAdmin(data)
      return { id: 0, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.admins() })
    },
    onError: (error) => {
      console.error('Failed to create admin:', error)
    },
  })
}

// Companies Management
export function useAdminCompanies(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.companies(filters),
    queryFn: async (): Promise<{ items: AdminCompany[]; total: number }> => {
      // TODO: Replace with real API call
      // return await api.admin.getCompanies(filters)
      return { items: [], total: 0 }
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useAdminVerifyCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (companyId: number) => {
      // TODO: Replace with real API call
      // return await api.admin.verifyCompany(companyId)
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.companies() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
    onError: (error) => {
      console.error('Failed to verify company:', error)
    },
  })
}

// Agencies Management
export function useAdminAgencies(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.agencies(filters),
    queryFn: async (): Promise<{ items: AdminAgency[]; total: number }> => {
      // TODO: Replace with real API call
      // return await api.admin.getAgencies(filters)
      return { items: [], total: 0 }
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useAdminVerifyAgency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (agencyId: number) => {
      // TODO: Replace with real API call
      // return await api.admin.verifyAgency(agencyId)
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.agencies() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
    onError: (error) => {
      console.error('Failed to verify agency:', error)
    },
  })
}

// Shifts Management
export function useAdminShifts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.shifts(filters),
    queryFn: async (): Promise<{ items: AdminShift[]; total: number }> => {
      // TODO: Replace with real API call
      // return await api.admin.getShifts(filters)
      return { items: [], total: 0 }
    },
    staleTime: 1000 * 60 * 2,
  })
}

// Transactions Management
export function useAdminTransactions(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.transactions(filters),
    queryFn: async (): Promise<{ items: AdminTransaction[]; total: number }> => {
      // TODO: Replace with real API call
      // return await api.admin.getTransactions(filters)
      return { items: [], total: 0 }
    },
    staleTime: 1000 * 60 * 2,
  })
}

// Payouts Management
export function useAdminPayouts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.payouts(filters),
    queryFn: async (): Promise<{ items: AdminPayout[]; total: number }> => {
      // TODO: Replace with real API call
      // return await api.admin.getPayouts(filters)
      return { items: [], total: 0 }
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useAdminProcessPayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payoutId: number) => {
      // TODO: Replace with real API call
      // return await api.admin.processPayout(payoutId)
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.payouts() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
    onError: (error) => {
      console.error('Failed to process payout:', error)
    },
  })
}

// Audit Logs
export function useAdminAuditLogs(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.auditLogs(filters),
    queryFn: async (): Promise<{ items: AuditLogEntry[]; total: number }> => {
      // TODO: Replace with real API call
      // return await api.admin.getAuditLogs(filters)
      return { items: [], total: 0 }
    },
    staleTime: 1000 * 60 * 2,
  })
}

// Reports
export function useAdminReports(filters?: { period?: string; start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: adminKeys.reports(filters as Record<string, string>),
    queryFn: async (): Promise<{ data: ReportData[]; summary: Record<string, number> }> => {
      // TODO: Replace with real API call
      // return await api.admin.getReports(filters)
      return { data: [], summary: {} }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes for reports
  })
}
