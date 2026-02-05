import type { StaffPublic } from './staff'
import type { CompanyPublic } from './company'
import type { Shift, ShiftStatus } from './shift'
import type { ApplicationStatus } from './application'

export type AgencyMode = 'staff_provider' | 'full_intermediary'

export interface AgencyProfile {
  id: number
  user_id: number
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
  id: number
  agency_name: string
  logo_url?: string
  city: string
  is_verified: boolean
  average_rating: number
  staff_count: number
}

export type StaffMemberStatus = 'active' | 'inactive' | 'pending'

export interface AgencyStaffMember {
  id: number
  agency_id: number
  staff_id: number
  staff_user_id?: number
  status: StaffMemberStatus
  joined_at: string
  staff?: StaffPublic
  shifts_completed: number
  total_hours: number
  is_available: boolean
  notes?: string
  // Fields from backend response when staff relationship not loaded
  name?: string
  email?: string | null
  skills?: string[]
  rating?: number
}

export type ClientStatus = 'active' | 'pending' | 'inactive'

export interface AgencyClient {
  id: number
  agency_id: number
  company_id?: number
  business_email: string
  status?: ClientStatus
  is_active?: boolean
  contract_start?: string
  contract_end?: string
  billing_rate_markup?: number
  company?: CompanyPublic
  shifts_this_month?: number
  total_billed?: number
  notes?: string
  created_at?: string
}

export type AssignmentStatus = 'assigned' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled'

export interface StaffAssignment {
  id: number
  shift_id: number
  staff_member_id: number
  agency_id: number
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
  id: number
  agency_id: number
  client_id: number
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
  id: number
  agency_id: number
  staff_member_id: number
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
  pending_clients: number
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
  id: number
  agency_id: number
  balance: number
  currency: string
  pending_payouts: number
  total_revenue: number
  created_at: string
  updated_at: string
}

// Agency shift (shift posted by agency on behalf of client)
// Note: ShiftStatus is imported from './shift'

export interface AgencyShift {
  id: number
  title: string
  description?: string
  company_id: number
  client_id?: number
  shift_type: string
  date: string
  start_time: string
  end_time: string
  hourly_rate: number
  location: string
  address?: string
  city: string
  spots_total: number
  spots_filled: number
  status: ShiftStatus
  requirements?: Record<string, unknown>
  created_at: string
  assigned_staff: number[]
}

// Agency application (application to agency-posted shift)
// Note: ApplicationStatus is imported from './application'

export interface AgencyApplication {
  id: number
  shift_id: number
  applicant_id: number
  status: ApplicationStatus
  cover_message?: string
  applied_at: string
  applicant_name?: string
}
