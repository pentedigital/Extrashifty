import type { CompanyPublic } from './company'

export type ShiftStatus = 'draft' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
export type ShiftType = 'bar' | 'server' | 'kitchen' | 'chef' | 'host' | 'general'

export interface Shift {
  id: string
  company_id: string
  venue_id?: string
  agency_id?: string
  client_id?: string
  title: string
  description: string
  shift_type: ShiftType
  date: string
  start_time: string
  end_time: string
  duration_hours?: number
  location: string // Backend field name
  location_name?: string // Alias for frontend compatibility
  address?: string
  city: string
  hourly_rate: number
  total_pay?: number
  currency?: string
  spots_total: number
  spots_filled: number
  required_skills?: string[]
  requirements?: Record<string, unknown>
  status: ShiftStatus
  created_at: string
  updated_at?: string
  company?: CompanyPublic
}

export interface ShiftFilters {
  search?: string
  city?: string
  shift_type?: ShiftType
  min_rate?: number
  max_rate?: number
  date_from?: string
  date_to?: string
  status?: ShiftStatus
}

export interface ShiftFormData {
  title: string
  description: string
  shift_type: ShiftType
  date: string
  start_time: string
  end_time: string
  location_name: string
  address: string
  city: string
  hourly_rate: number
  spots_total: number
  required_skills: string[]
  venue_id?: string
}
