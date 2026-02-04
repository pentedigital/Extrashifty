export interface StaffProfile {
  id: string
  user_id: string
  display_name: string
  bio?: string
  avatar_url?: string
  skills: string[]
  experience_years: number
  certifications: string[]
  availability: StaffAvailability
  hourly_rate_min?: number
  hourly_rate_max?: number
  city: string
  is_available: boolean
  is_verified: boolean
  is_id_verified: boolean
  is_background_checked: boolean
  is_right_to_work_verified: boolean
  average_rating: number
  review_count: number
  shifts_completed: number
  total_hours: number
  created_at: string
  updated_at: string
}

export interface StaffPublic {
  id: string
  user_id: string
  display_name: string
  avatar_url?: string
  skills: string[]
  experience_years: number
  city: string
  is_verified: boolean
  is_id_verified: boolean
  average_rating: number
  shifts_completed: number
}

export interface StaffAvailability {
  monday: TimeSlot[]
  tuesday: TimeSlot[]
  wednesday: TimeSlot[]
  thursday: TimeSlot[]
  friday: TimeSlot[]
  saturday: TimeSlot[]
  sunday: TimeSlot[]
}

export interface TimeSlot {
  start: string
  end: string
}

export interface StaffStats {
  upcoming_shifts: number
  pending_applications: number
  total_earned: number
  average_rating: number
  wallet_balance: number
}

export interface StaffOnboardingData {
  display_name: string
  bio?: string
  skills: string[]
  experience_years: number
  certifications: string[]
  city: string
  hourly_rate_min?: number
  hourly_rate_max?: number
}

export interface StaffWallet {
  id: string
  staff_id: string
  balance: number
  currency: string
  pending_earnings: number
  total_earned: number
  created_at: string
  updated_at: string
}

export interface ClockRecord {
  id: string
  shift_id: string
  staff_id: string
  clock_in?: string
  clock_out?: string
  total_hours?: number
  status: 'pending' | 'clocked_in' | 'clocked_out' | 'approved' | 'disputed'
  notes?: string
  created_at: string
}

// Rating from company to staff (two-way rating system)
export interface StaffRating {
  id: string
  staff_id: string
  company_id: string
  shift_id: string
  rating: number
  comment?: string
  created_at: string
}
