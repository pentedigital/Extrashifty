import type { Shift } from './shift'
import type { StaffPublic } from './staff'
import type { AgencyPublic } from './agency'
import type { User } from './user'

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export interface Application {
  id: number
  shift_id: number
  applicant_id: number
  status: ApplicationStatus
  cover_message?: string
  applied_at: string
  updated_at?: string
  shift?: Shift
  applicant?: User
  // Legacy fields for compatibility
  staff_id?: string
  agency_id?: string
  staff?: StaffPublic
  agency?: AgencyPublic
}

export interface ApplicationWithDetails extends Application {
  shift: Shift
  applicant: User
}
