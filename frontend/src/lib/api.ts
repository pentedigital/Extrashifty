const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1'

class TokenManager {
  private accessTokenKey = 'extrashifty_access_token'
  private refreshTokenKey = 'extrashifty_refresh_token'

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey)
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey)
  }

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(this.accessTokenKey, accessToken)
    localStorage.setItem(this.refreshTokenKey, refreshToken)
  }

  clearTokens() {
    localStorage.removeItem(this.accessTokenKey)
    localStorage.removeItem(this.refreshTokenKey)
  }

  hasTokens(): boolean {
    return !!this.getAccessToken()
  }
}

export const tokenManager = new TokenManager()

export class ApiClientError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.data = data
  }
}

// Token refresh state
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenManager.getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      tokenManager.clearTokens()
      return null
    }

    const data = await response.json()
    tokenManager.setTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    tokenManager.clearTokens()
    return null
  }
}

async function baseFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const token = tokenManager.getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle 401 - try to refresh token
  if (response.status === 401 && retry && tokenManager.getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true
      const newToken = await refreshAccessToken()
      isRefreshing = false

      if (newToken) {
        onTokenRefreshed(newToken)
        return baseFetch<T>(endpoint, options, false)
      } else {
        window.location.href = '/login'
        throw new ApiClientError('Session expired', 401)
      }
    } else {
      // Wait for the refresh to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (newToken: string) => {
          headers['Authorization'] = `Bearer ${newToken}`
          try {
            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
              ...options,
              headers,
            })
            if (!retryResponse.ok) {
              reject(new ApiClientError('Request failed after token refresh', retryResponse.status))
            }
            resolve(retryResponse.json())
          } catch (err) {
            reject(err)
          }
        })
      })
    }
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred'
    let errorData: unknown

    try {
      errorData = await response.json()
      if (typeof errorData === 'object' && errorData !== null) {
        if ('detail' in errorData) {
          errorMessage = String((errorData as { detail: unknown }).detail)
        } else if ('message' in errorData) {
          errorMessage = String((errorData as { message: unknown }).message)
        }
      }
    } catch {
      errorMessage = response.statusText
    }

    throw new ApiClientError(errorMessage, response.status, errorData)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      baseFetch<{ access_token: string; refresh_token: string; user: import('@/types/user').User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (data: {
      email: string
      password: string
      full_name: string
      user_type: 'staff' | 'company' | 'agency'
    }) =>
      baseFetch<{ access_token: string; refresh_token: string; user: import('@/types/user').User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    refresh: () =>
      baseFetch<{ access_token: string; refresh_token: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: tokenManager.getRefreshToken() }),
      }),

    me: () => baseFetch<import('@/types/user').User>('/auth/me'),

    logout: () => baseFetch<void>('/auth/logout', { method: 'POST' }),

    passwordRecovery: (email: string) =>
      baseFetch<void>(`/auth/password-recovery/${encodeURIComponent(email)}`, {
        method: 'POST',
      }),

    resetPassword: (data: { token: string; new_password: string }) =>
      baseFetch<void>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  users: {
    update: (data: { full_name?: string; email?: string; avatar_url?: string }) =>
      baseFetch<import('@/types/user').User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    updatePassword: (data: { current_password: string; new_password: string }) =>
      baseFetch<{ message: string }>('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: () =>
      baseFetch<{ message: string }>('/users/me', {
        method: 'DELETE',
      }),

    getPublicProfile: (userId: string) =>
      baseFetch<{
        id: number
        full_name: string
        user_type: import('@/types/user').UserType
        is_verified: boolean
        created_at: string
      }>(`/users/${userId}/public`),

    getStats: () =>
      baseFetch<import('@/types/staff').StaffStats>('/users/me/stats'),
  },

  shifts: {
    list: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/shift').Shift[]; total: number }>(`/shifts${query}`)
    },

    getMyShifts: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<import('@/types/shift').Shift[]>(`/shifts/my-shifts${query}`)
    },

    get: (id: string) => baseFetch<import('@/types/shift').Shift>(`/shifts/${id}`),

    create: (data: Partial<import('@/types/shift').Shift>) =>
      baseFetch<import('@/types/shift').Shift>('/shifts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<import('@/types/shift').Shift>) =>
      baseFetch<import('@/types/shift').Shift>(`/shifts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      baseFetch<void>(`/shifts/${id}`, { method: 'DELETE' }),

    apply: (shiftId: string, coverMessage?: string) =>
      baseFetch<{ id: number; status: string; message: string }>(`/shifts/${shiftId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ cover_message: coverMessage }),
      }),
  },

  applications: {
    list: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/application').Application[]; total: number }>(`/applications${query}`)
    },

    create: (data: { shift_id: string; cover_message?: string }) =>
      baseFetch<import('@/types/application').Application>('/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: { status: import('@/types/application').ApplicationStatus }) =>
      baseFetch<import('@/types/application').Application>(`/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  staff: {
    getProfile: () => baseFetch<import('@/types/staff').StaffProfile>('/staff/profile'),

    updateProfile: (data: Partial<import('@/types/staff').StaffProfile>) =>
      baseFetch<import('@/types/staff').StaffProfile>('/staff/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getShifts: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/shift').Shift[]; total: number }>(`/staff/shifts${query}`)
    },

    getWallet: () => baseFetch<import('@/types/staff').StaffWallet>('/staff/wallet'),

    getClockRecords: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/staff').ClockRecord[]; total: number }>(`/staff/clock-records${query}`)
    },

    clockIn: (data: { shift_id: number; notes?: string }) =>
      baseFetch<{
        id: number
        shift_id: number
        clock_in: string
        clock_out: string | null
        status: string
        message: string
      }>('/staff/clock-in', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    clockOut: (data: { shift_id: number; notes?: string }) =>
      baseFetch<{
        id: number
        shift_id: number
        clock_in: string
        clock_out: string | null
        status: string
        message: string
      }>('/staff/clock-out', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getApplications: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{
        items: Array<{
          id: number
          shift_id: number
          applicant_id: number
          status: string
          cover_message: string | null
          applied_at: string
          shift_title: string | null
          shift_date: string | null
          company_name: string | null
        }>
        total: number
      }>(`/staff/applications${query}`)
    },

    createApplication: (data: { shift_id: number; cover_message?: string }) =>
      baseFetch<{
        id: number
        shift_id: number
        applicant_id: number
        status: string
        cover_message: string | null
        applied_at: string
        shift_title: string | null
        shift_date: string | null
        company_name: string | null
      }>('/staff/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    withdrawApplication: (applicationId: number) =>
      baseFetch<{ message: string }>(`/staff/applications/${applicationId}`, {
        method: 'DELETE',
      }),

    getEarnings: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{
        items: Array<{
          id: number
          shift_id: number
          shift_title: string
          date: string
          hours_worked: number
          hourly_rate: number
          gross_amount: number
          net_amount: number
          status: string
        }>
        total: number
        total_gross: number
        total_net: number
      }>(`/staff/earnings${query}`)
    },

    getReviews: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{
        items: Array<{
          id: number
          shift_id: number
          shift_title: string
          company_name: string
          rating: number
          comment: string | null
          created_at: string
        }>
        total: number
        average_rating: number
      }>(`/staff/reviews${query}`)
    },
  },

  company: {
    getProfile: () => baseFetch<import('@/types/company').CompanyProfile>('/company/profile'),

    updateProfile: (data: Partial<import('@/types/company').CompanyProfile>) =>
      baseFetch<import('@/types/company').CompanyProfile>('/company/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getWallet: () => baseFetch<import('@/types/company').CompanyWallet>('/company/wallet'),

    // Venues (multi-venue support)
    getVenues: () => baseFetch<{ items: import('@/types/company').Venue[]; total: number }>('/company/venues'),

    createVenue: (data: import('@/types/company').VenueFormData) =>
      baseFetch<import('@/types/company').Venue>('/company/venues', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateVenue: (id: string, data: Partial<import('@/types/company').VenueFormData>) =>
      baseFetch<import('@/types/company').Venue>(`/company/venues/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteVenue: (id: string) =>
      baseFetch<void>(`/company/venues/${id}`, { method: 'DELETE' }),

    // Shifts
    getShifts: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/shift').Shift[]; total: number; skip: number; limit: number }>(`/company/shifts${query}`)
    },

    createShift: (data: import('@/types/shift').ShiftFormData) =>
      baseFetch<import('@/types/shift').Shift>('/company/shifts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateShift: (id: string, data: Partial<import('@/types/shift').ShiftFormData>) =>
      baseFetch<import('@/types/shift').Shift>(`/company/shifts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteShift: (id: string) =>
      baseFetch<void>(`/company/shifts/${id}`, { method: 'DELETE' }),

    // Applications
    getShiftApplications: (shiftId: string) =>
      baseFetch<{ items: import('@/types/application').Application[]; total: number }>(`/company/shifts/${shiftId}/applications`),

    acceptApplication: (applicationId: string) =>
      baseFetch<import('@/types/application').Application>(`/company/applications/${applicationId}/accept`, {
        method: 'POST',
      }),

    rejectApplication: (applicationId: string) =>
      baseFetch<import('@/types/application').Application>(`/company/applications/${applicationId}/reject`, {
        method: 'POST',
      }),

    // Spending
    getSpending: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/company').SpendingRecord[]; total: number; total_spent: number }>(`/company/spending${query}`)
    },

    // Reviews
    createReview: (data: { shift_id: number; worker_id: number; rating: number; comment?: string }) =>
      baseFetch<import('@/types/company').CompanyReview>('/company/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getReviews: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/company').CompanyReview[]; total: number }>(`/company/reviews${query}`)
    },
  },

  agency: {
    getProfile: () => baseFetch<import('@/types/agency').AgencyProfile>('/agency/profile'),

    updateProfile: (data: Partial<import('@/types/agency').AgencyProfile>) =>
      baseFetch<import('@/types/agency').AgencyProfile>('/agency/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Staff management
    getStaff: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/agency').AgencyStaffMember[]; total: number }>(`/agency/staff${query}`)
    },

    inviteStaff: (data: { emails: string[]; message?: string }) =>
      baseFetch<void>('/agency/staff/invite', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateStaffMember: (id: string, data: Partial<import('@/types/agency').AgencyStaffMember>) =>
      baseFetch<import('@/types/agency').AgencyStaffMember>(`/agency/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    removeStaffMember: (id: string) =>
      baseFetch<void>(`/agency/staff/${id}`, {
        method: 'DELETE',
      }),

    addStaff: (data: { staff_user_id: number; notes?: string; is_available?: boolean }) =>
      baseFetch<import('@/types/agency').AgencyStaffMember>('/agency/staff', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getStaffAvailability: (staffId: string) =>
      baseFetch<{ staff_id: number; is_available: boolean; status: string; notes?: string }>(`/agency/staff/${staffId}/availability`),

    updateStaffAvailability: (staffId: string, data: { is_available: boolean; notes?: string }) =>
      baseFetch<{ staff_id: number; is_available: boolean; status: string; notes?: string }>(`/agency/staff/${staffId}/availability`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Client management
    getClients: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/agency').AgencyClient[]; total: number }>(`/agency/clients${query}`)
    },

    addClient: (data: { business_email: string; billing_rate_markup?: number; notes?: string }) =>
      baseFetch<import('@/types/agency').AgencyClient>('/agency/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateClient: (id: string, data: { billing_rate_markup?: number; notes?: string; is_active?: boolean }) =>
      baseFetch<import('@/types/agency').AgencyClient>(`/agency/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    removeClient: (id: string) =>
      baseFetch<void>(`/agency/clients/${id}`, {
        method: 'DELETE',
      }),

    // Shift management
    getShifts: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<import('@/types/agency').AgencyShift[]>(`/agency/shifts${query}`)
    },

    createShift: (data: {
      client_id: number
      title: string
      description?: string
      shift_type: string
      date: string
      start_time: string
      end_time: string
      hourly_rate: number
      location: string
      address?: string
      city: string
      spots_total?: number
      requirements?: Record<string, unknown>
    }) =>
      baseFetch<import('@/types/agency').AgencyShift>('/agency/shifts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateShift: (id: string, data: {
      title?: string
      description?: string
      shift_type?: string
      date?: string
      start_time?: string
      end_time?: string
      hourly_rate?: number
      location?: string
      address?: string
      city?: string
      spots_total?: number
      status?: string
      requirements?: Record<string, unknown>
    }) =>
      baseFetch<import('@/types/agency').AgencyShift>(`/agency/shifts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteShift: (id: string) =>
      baseFetch<void>(`/agency/shifts/${id}`, {
        method: 'DELETE',
      }),

    assignStaffToShift: (shiftId: string, staffMemberId: number) =>
      baseFetch<{ shift_id: number; staff_member_id: number; assigned_at: string; message: string }>(`/agency/shifts/${shiftId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ staff_member_id: staffMemberId }),
      }),

    // Application management
    getApplications: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<import('@/types/agency').AgencyApplication[]>(`/agency/applications${query}`)
    },

    acceptApplication: (applicationId: string) =>
      baseFetch<{ id: number; status: string; message: string }>(`/agency/applications/${applicationId}/accept`, {
        method: 'POST',
      }),

    rejectApplication: (applicationId: string) =>
      baseFetch<{ id: number; status: string; message: string }>(`/agency/applications/${applicationId}/reject`, {
        method: 'POST',
      }),

    // Staff assignments
    getAssignments: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/agency').StaffAssignment[]; total: number }>(`/agency/assignments${query}`)
    },

    createAssignment: (data: { shift_id: string; staff_member_id: string }) =>
      baseFetch<import('@/types/agency').StaffAssignment>('/agency/assignments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateAssignment: (id: string, data: Partial<import('@/types/agency').StaffAssignment>) =>
      baseFetch<import('@/types/agency').StaffAssignment>(`/agency/assignments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Billing - Invoices
    getInvoices: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/agency').Invoice[]; total: number }>(`/agency/invoices${query}`)
    },

    createInvoice: (data: {
      client_id: number
      period_start: string
      period_end: string
      due_date: string
      amount: number
      currency?: string
      notes?: string
    }) =>
      baseFetch<import('@/types/agency').Invoice>('/agency/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getInvoice: (id: string) =>
      baseFetch<import('@/types/agency').Invoice>(`/agency/invoices/${id}`),

    sendInvoice: (id: string) =>
      baseFetch<import('@/types/agency').Invoice>(`/agency/invoices/${id}/send`, {
        method: 'PATCH',
      }),

    markInvoicePaid: (id: string) =>
      baseFetch<import('@/types/agency').Invoice>(`/agency/invoices/${id}/mark-paid`, {
        method: 'PATCH',
      }),

    // Billing - Payroll
    getPayroll: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/agency').PayrollEntry[]; total: number }>(`/agency/payroll${query}`)
    },

    processPayroll: (data: {
      period_start: string
      period_end: string
      staff_member_ids?: number[]
    }) =>
      baseFetch<{
        processed: number
        entries: import('@/types/agency').PayrollEntry[]
        message: string
      }>('/agency/payroll/process', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getPayrollEntry: (id: string) =>
      baseFetch<import('@/types/agency').PayrollEntry>(`/agency/payroll/${id}`),

    getWallet: () => baseFetch<import('@/types/agency').AgencyWallet>('/agency/wallet'),

    // Stats
    getStats: () => baseFetch<import('@/types/agency').AgencyStats>('/agency/stats'),
  },

  marketplace: {
    listShifts: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{
        items: import('@/types/shift').Shift[]
        total: number
        skip: number
        limit: number
      }>(`/marketplace/shifts${query}`)
    },

    searchShifts: (params?: {
      location?: string
      job_type?: string
      min_pay?: number
      max_pay?: number
      date_from?: string
      date_to?: string
      skills?: string
      search?: string
      skip?: number
      limit?: number
    }) => {
      const searchParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value))
          }
        })
      }
      const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
      return baseFetch<{
        items: import('@/types/shift').Shift[]
        total: number
        skip: number
        limit: number
      }>(`/marketplace/shifts/search${query}`)
    },

    getShift: (id: string) =>
      baseFetch<import('@/types/shift').Shift>(`/marketplace/shifts/${id}`),

    getStats: () =>
      baseFetch<{
        total_shifts: number
        total_companies: number
        avg_hourly_rate: number
      }>('/marketplace/stats'),
  },

  reviews: {
    create: (data: {
      reviewee_id: number
      shift_id: number
      rating: number
      comment?: string
      review_type: 'staff_to_company' | 'company_to_staff'
    }) =>
      baseFetch<{
        id: number
        reviewer_id: number
        reviewee_id: number
        shift_id: number
        rating: number
        comment: string | null
        review_type: string
        created_at: string
        reviewer_name: string | null
        reviewee_name: string | null
      }>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getStaffReviews: (staffId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{
        items: Array<{
          id: number
          reviewer_id: number
          reviewee_id: number
          shift_id: number
          rating: number
          comment: string | null
          review_type: string
          created_at: string
          reviewer_name: string | null
          reviewee_name: string | null
        }>
        total: number
        average_rating: number | null
      }>(`/reviews/staff/${staffId}${query}`)
    },

    getCompanyReviews: (companyId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{
        items: Array<{
          id: number
          reviewer_id: number
          reviewee_id: number
          shift_id: number
          rating: number
          comment: string | null
          review_type: string
          created_at: string
          reviewer_name: string | null
          reviewee_name: string | null
        }>
        total: number
        average_rating: number | null
      }>(`/reviews/company/${companyId}${query}`)
    },

    getShiftReviews: (shiftId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{
        items: Array<{
          id: number
          reviewer_id: number
          reviewee_id: number
          shift_id: number
          rating: number
          comment: string | null
          review_type: string
          created_at: string
          reviewer_name: string | null
          reviewee_name: string | null
        }>
        total: number
        average_rating: number | null
      }>(`/reviews/shift/${shiftId}${query}`)
    },
  },

  notifications: {
    list: (params?: { skip?: number; limit?: number; unread_only?: boolean }) => {
      const searchParams = new URLSearchParams()
      if (params?.skip !== undefined) searchParams.set('skip', String(params.skip))
      if (params?.limit !== undefined) searchParams.set('limit', String(params.limit))
      if (params?.unread_only !== undefined) searchParams.set('unread_only', String(params.unread_only))
      const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
      return baseFetch<{
        items: Array<{
          id: number
          user_id: number
          type: string
          title: string
          message: string
          is_read: boolean
          data: Record<string, unknown> | null
          created_at: string
        }>
        total: number
        unread_count: number
      }>(`/notifications${query}`)
    },

    markAsRead: (notificationId: number) =>
      baseFetch<{
        id: number
        user_id: number
        type: string
        title: string
        message: string
        is_read: boolean
        data: Record<string, unknown> | null
        created_at: string
      }>(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      }),

    markAllAsRead: () =>
      baseFetch<{ message: string; count: number }>('/notifications/read-all', {
        method: 'PATCH',
      }),

    delete: (notificationId: number) =>
      baseFetch<void>(`/notifications/${notificationId}`, {
        method: 'DELETE',
      }),

    getPreferences: () =>
      baseFetch<{
        id: number
        user_id: number
        email_enabled: boolean
        push_enabled: boolean
        shift_updates: boolean
        payment_updates: boolean
        marketing: boolean
      }>('/notifications/preferences'),

    updatePreferences: (data: {
      email_enabled?: boolean
      push_enabled?: boolean
      shift_updates?: boolean
      payment_updates?: boolean
      marketing?: boolean
    }) =>
      baseFetch<{
        id: number
        user_id: number
        email_enabled: boolean
        push_enabled: boolean
        shift_updates: boolean
        payment_updates: boolean
        marketing: boolean
      }>('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  wallet: {
    getBalance: () =>
      baseFetch<{
        id: number
        user_id: number
        balance: number
        currency: string
        created_at: string
        updated_at: string
      }>('/wallet/balance'),

    getTransactions: (params?: {
      skip?: number
      limit?: number
      type?: 'earning' | 'withdrawal' | 'top_up' | 'payment'
      status?: 'pending' | 'completed' | 'failed'
    }) => {
      const searchParams = new URLSearchParams()
      if (params?.skip !== undefined) searchParams.set('skip', String(params.skip))
      if (params?.limit !== undefined) searchParams.set('limit', String(params.limit))
      if (params?.type) searchParams.set('type', params.type)
      if (params?.status) searchParams.set('status', params.status)
      const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
      return baseFetch<{
        items: Array<{
          id: number
          wallet_id: number
          type: 'earning' | 'withdrawal' | 'top_up' | 'payment'
          amount: number
          description: string
          status: 'pending' | 'completed' | 'failed'
          reference_id: string | null
          created_at: string
        }>
        total: number
      }>(`/wallet/transactions${query}`)
    },

    withdraw: (data: { amount: number; payment_method_id: number }) =>
      baseFetch<{
        transaction_id: number
        amount: number
        status: 'pending' | 'completed' | 'failed'
        message: string
      }>('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    topUp: (data: { amount: number; payment_method_id: number }) =>
      baseFetch<{
        transaction_id: number
        amount: number
        status: 'pending' | 'completed' | 'failed'
        new_balance: number
        message: string
      }>('/wallet/top-up', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getPaymentMethods: () =>
      baseFetch<{
        items: Array<{
          id: number
          user_id: number
          type: 'card' | 'bank_account'
          last_four: string
          brand: string | null
          is_default: boolean
          created_at: string
        }>
        total: number
      }>('/wallet/payment-methods'),

    addPaymentMethod: (data: {
      type: 'card' | 'bank_account'
      last_four: string
      brand?: string
      is_default?: boolean
      external_id?: string
    }) =>
      baseFetch<{
        id: number
        user_id: number
        type: 'card' | 'bank_account'
        last_four: string
        brand: string | null
        is_default: boolean
        created_at: string
      }>('/wallet/payment-methods', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    removePaymentMethod: (paymentMethodId: number) =>
      baseFetch<void>(`/wallet/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      }),
  },
}
