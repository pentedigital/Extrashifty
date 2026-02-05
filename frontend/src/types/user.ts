export type UserType = 'staff' | 'company' | 'agency' | 'admin' | 'super_admin'

export interface User {
  id: number
  email: string
  full_name: string
  user_type: UserType
  avatar_url?: string
  phone?: string
  is_verified: boolean
  is_id_verified: boolean
  is_background_checked: boolean
  is_right_to_work_verified: boolean
  mfa_enabled: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
