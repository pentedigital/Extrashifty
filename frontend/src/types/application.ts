import type { Shift } from './shift'
import type { StaffPublic } from './staff'
import type { AgencyPublic } from './agency'

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export interface Application {
  id: string
  shift_id: string
  staff_id: string
  agency_id?: string
  status: ApplicationStatus
  cover_message?: string
  applied_at: string
  updated_at: string
  shift?: Shift
  staff?: StaffPublic
  agency?: AgencyPublic
}

export interface ApplicationWithDetails extends Application {
  shift: Shift
  staff: StaffPublic
  agency?: AgencyPublic
}
