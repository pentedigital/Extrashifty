import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { STALE_TIME } from '@/constants/queryConfig'

/**
 * Admin API Hooks
 *
 * IMPORTANT: Backend admin endpoints do NOT exist yet.
 *
 * The backend has the following routers in /backend/app/api/v1/api.py:
 * - auth, users, shifts, applications, agency, staff, company, marketplace,
 * - reviews, notifications, wallet, payments, invoices, verification,
 * - disputes, appeals, tax, gdpr, penalties, webhooks, websocket
 *
 * There is NO /admin router. The 'admin' user type exists in the database schema
 * (see backend/alembic/versions/001_initial_schema.py) but admin-specific endpoints
 * have not been implemented.
 *
 * These hooks return empty/default data as placeholders until the backend
 * admin API is implemented. When implementing the backend, add endpoints like:
 * - GET /admin/stats - Dashboard statistics
 * - GET /admin/users - List all users with filters
 * - PATCH /admin/users/:id - Update user (verify, suspend, etc.)
 * - GET /admin/companies - List companies for verification
 * - GET /admin/agencies - List agencies for verification
 * - GET /admin/shifts - All shifts across platform
 * - GET /admin/transactions - Financial transactions
 * - GET /admin/payouts - Payout requests
 * - GET /admin/audit-logs - Admin action logs
 * - GET /admin/reports - Analytics and reports
 *
 * Then update these hooks to call the real API endpoints.
 */

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
      // Backend endpoint not implemented: GET /admin/stats
      // When available, replace with: return await api.admin.getStats()
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
    staleTime: STALE_TIME.SHORT,
  })
}

// Users Management
export function useAdminUsers(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: async (): Promise<{ items: AdminUser[]; total: number }> => {
      // Backend endpoint not implemented: GET /admin/users
      // When available, replace with: return await api.admin.getUsers(filters)
      return { items: [], total: 0 }
    },
    staleTime: STALE_TIME.SHORT,
  })
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: Partial<AdminUser> }) => {
      // Backend endpoint not implemented: PATCH /admin/users/:id
      // When available, replace with: return await api.admin.updateUser(userId, data)
      return { ...data, id: userId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
    },
  })
}

export function useAdminDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (_userId: number) => {
      // Backend endpoint not implemented: DELETE /admin/users/:id
      // When available, replace with: return await api.admin.deleteUser(_userId)
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
  })
}

// Admin Users Management
export function useAdminAdmins(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.admins(filters),
    queryFn: async (): Promise<{ items: AdminUser[]; total: number }> => {
      // Backend endpoint not implemented: GET /admin/admins
      // When available, replace with: return await api.admin.getAdmins(filters)
      return { items: [], total: 0 }
    },
    staleTime: STALE_TIME.SHORT,
  })
}

export function useAdminCreateAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { email: string; full_name: string; password: string }) => {
      // Backend endpoint not implemented: POST /admin/admins
      // When available, replace with: return await api.admin.createAdmin(data)
      return { id: 0, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.admins() })
    },
  })
}

// Companies Management
export function useAdminCompanies(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.companies(filters),
    queryFn: async (): Promise<{ items: AdminCompany[]; total: number }> => {
      // Backend endpoint not implemented: GET /admin/companies
      // When available, replace with: return await api.admin.getCompanies(filters)
      return { items: [], total: 0 }
    },
    staleTime: STALE_TIME.SHORT,
  })
}

export function useAdminVerifyCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (_companyId: number) => {
      // Backend endpoint not implemented: POST /admin/companies/:id/verify
      // When available, replace with: return await api.admin.verifyCompany(_companyId)
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.companies() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
  })
}

// Agencies Management
export function useAdminAgencies(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.agencies(filters),
    queryFn: async (): Promise<{ items: AdminAgency[]; total: number }> => {
      // Backend endpoint not implemented: GET /admin/agencies
      // When available, replace with: return await api.admin.getAgencies(filters)
      return { items: [], total: 0 }
    },
    staleTime: STALE_TIME.SHORT,
  })
}

export function useAdminVerifyAgency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (_agencyId: number) => {
      // Backend endpoint not implemented: POST /admin/agencies/:id/verify
      // When available, replace with: return await api.admin.verifyAgency(_agencyId)
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.agencies() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
  })
}

// Shifts Management
export function useAdminShifts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.shifts(filters),
    queryFn: async (): Promise<{ items: AdminShift[]; total: number }> => {
      // Backend endpoint not implemented: GET /admin/shifts
      // When available, replace with: return await api.admin.getShifts(filters)
      return { items: [], total: 0 }
    },
    staleTime: STALE_TIME.SHORT,
  })
}

// Transactions Management
export function useAdminTransactions(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.transactions(filters),
    queryFn: async (): Promise<{ items: AdminTransaction[]; total: number }> => {
      // Backend endpoint not implemented: GET /admin/transactions
      // When available, replace with: return await api.admin.getTransactions(filters)
      return { items: [], total: 0 }
    },
    staleTime: STALE_TIME.SHORT,
  })
}

// Payouts Management
export function useAdminPayouts(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.payouts(filters),
    queryFn: async (): Promise<{ items: AdminPayout[]; total: number }> => {
      // Backend endpoint not implemented: GET /admin/payouts
      // When available, replace with: return await api.admin.getPayouts(filters)
      return { items: [], total: 0 }
    },
    staleTime: STALE_TIME.SHORT,
  })
}

export function useAdminProcessPayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (_payoutId: number) => {
      // Backend endpoint not implemented: POST /admin/payouts/:id/process
      // When available, replace with: return await api.admin.processPayout(_payoutId)
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.payouts() })
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() })
    },
  })
}

// Audit Logs
export function useAdminAuditLogs(filters?: Record<string, string>) {
  return useQuery({
    queryKey: adminKeys.auditLogs(filters),
    queryFn: async (): Promise<{ items: AuditLogEntry[]; total: number }> => {
      // Backend endpoint not implemented: GET /admin/audit-logs
      // When available, replace with: return await api.admin.getAuditLogs(filters)
      return { items: [], total: 0 }
    },
    staleTime: STALE_TIME.SHORT,
  })
}

// Reports
export function useAdminReports(filters?: { period?: string; start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: adminKeys.reports(filters as Record<string, string>),
    queryFn: async (): Promise<{ data: ReportData[]; summary: Record<string, number> }> => {
      const params: Record<string, string> = {}
      if (filters?.period) params.period = filters.period
      if (filters?.start_date) params.start_date = filters.start_date
      if (filters?.end_date) params.end_date = filters.end_date
      return await api.admin.getReports(Object.keys(params).length > 0 ? params : undefined)
    },
    staleTime: STALE_TIME.MEDIUM, // Reports are more stable, 5 minutes
  })
}
