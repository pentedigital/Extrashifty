import type { StaffPublic } from './staff'
import type { CompanyPublic } from './company'
import type { Shift } from './shift'

export type AgencyMode = 'staff_provider' | 'full_intermediary'

export interface AgencyProfile {
  id: string
  user_id: string
  agency_name: string
  mode: AgencyMode
  logo_url?: string
  description?: string
  address: string
  city: string
  contact_email: string
  contact_phone?: string
  website?: string
  is_verified: boolean
  is_id_verified: boolean
  is_background_checked: boolean
  average_rating: number
  review_count: number
  staff_count: number
  client_count: number
  created_at: string
  updated_at: string
}

export interface AgencyPublic {
  id: string
  agency_name: string
  logo_url?: string
  city: string
  is_verified: boolean
  average_rating: number
  staff_count: number
}

export type StaffMemberStatus = 'active' | 'inactive' | 'pending'

export interface AgencyStaffMember {
  id: string
  agency_id: string
  staff_id: string
  status: StaffMemberStatus
  joined_at: string
  staff: StaffPublic
  shifts_completed: number
  total_hours: number
  is_available: boolean
  notes?: string
}

export type ClientStatus = 'active' | 'pending' | 'inactive'

export interface AgencyClient {
  id: string
  agency_id: string
  company_id: string
  status: ClientStatus
  contract_start: string
  contract_end?: string
  billing_rate_markup?: number
  company: CompanyPublic
  shifts_this_month: number
  total_billed: number
  notes?: string
}

export type AssignmentStatus = 'assigned' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled'

export interface StaffAssignment {
  id: string
  shift_id: string
  staff_member_id: string
  agency_id: string
  status: AssignmentStatus
  assigned_at: string
  confirmed_at?: string
  checked_in_at?: string
  completed_at?: string
  shift: Shift
  staff_member: AgencyStaffMember
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: string
  agency_id: string
  client_id: string
  invoice_number: string
  status: InvoiceStatus
  amount: number
  currency: string
  period_start: string
  period_end: string
  due_date: string
  paid_date?: string
  shifts: Shift[]
  client: AgencyClient
  created_at: string
}

export type PayrollStatus = 'pending' | 'approved' | 'paid'

export interface PayrollEntry {
  id: string
  agency_id: string
  staff_member_id: string
  period_start: string
  period_end: string
  status: PayrollStatus
  hours_worked: number
  gross_amount: number
  deductions: number
  net_amount: number
  currency: string
  shifts: Shift[]
  staff_member: AgencyStaffMember
  paid_at?: string
  created_at: string
}

export interface AgencyStats {
  total_staff: number
  available_staff: number
  total_clients: number
  active_shifts: number
  revenue_this_week: number
  pending_invoices: number
  pending_payroll: number
}

export interface AgencyOnboardingData {
  agency_name: string
  mode: AgencyMode
  description?: string
  address: string
  city: string
  contact_email: string
  contact_phone?: string
  website?: string
}

// Agency wallet for payments
export interface AgencyWallet {
  id: string
  agency_id: string
  balance: number
  currency: string
  pending_payouts: number
  total_revenue: number
  created_at: string
  updated_at: string
}
