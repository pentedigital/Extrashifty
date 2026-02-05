export type CompanyType = 'restaurant' | 'bar' | 'hotel' | 'catering' | 'events' | 'cafe' | 'other'

export interface CompanyProfile {
  id: string
  user_id: string
  company_name: string
  company_type: CompanyType
  logo_url?: string
  description?: string
  address: string
  city: string
  phone?: string
  website?: string
  is_verified: boolean
  is_id_verified: boolean
  is_background_checked: boolean
  average_rating: number
  review_count: number
  total_shifts_posted: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface CompanyPublic {
  id: string
  company_name: string
  company_type: CompanyType
  // Aliases for compatibility
  business_name?: string
  business_type?: string
  logo_url?: string
  city: string
  is_verified: boolean
  average_rating: number
  review_count: number
}

export interface CompanyStats {
  active_shifts: number
  pending_applications: number
  filled_shifts: number
  total_spent: number
  average_rating: number
  venues_count: number
}

export interface CompanyOnboardingData {
  company_name: string
  company_type: CompanyType
  description?: string
  address: string
  city: string
  phone?: string
  website?: string
}

// Multi-venue support
export interface Venue {
  id: string
  company_id: string
  name: string
  address: string
  city: string
  phone?: string
  is_primary: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VenueFormData {
  name: string
  address: string
  city: string
  phone?: string
  is_primary: boolean
}

// Company wallet for payments
export interface CompanyWallet {
  id: string
  company_id: string
  balance: number
  currency: string
  escrow_balance: number
  total_spent: number
  created_at: string
  updated_at: string
}

// Rating types for two-way ratings
export interface CompanyRating {
  id: string
  company_id: string
  staff_id: string
  shift_id: string
  rating: number
  comment?: string
  created_at: string
}
