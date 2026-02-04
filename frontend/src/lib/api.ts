const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

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

async function baseFetch<T>(
  endpoint: string,
  options: RequestInit = {}
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
  },

  shifts: {
    list: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/shift').Shift[]; total: number }>(`/shifts${query}`)
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
  },

  company: {
    getProfile: () => baseFetch<import('@/types/company').CompanyProfile>('/company/profile'),

    updateProfile: (data: Partial<import('@/types/company').CompanyProfile>) =>
      baseFetch<import('@/types/company').CompanyProfile>('/company/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getShifts: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/shift').Shift[]; total: number }>(`/company/shifts${query}`)
    },

    getApplicants: (shiftId: string) =>
      baseFetch<{ items: import('@/types/application').Application[]; total: number }>(`/company/shifts/${shiftId}/applicants`),

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

    inviteStaff: (data: { email: string; message?: string }) =>
      baseFetch<void>('/agency/staff/invite', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateStaffMember: (id: string, data: Partial<import('@/types/agency').AgencyStaffMember>) =>
      baseFetch<import('@/types/agency').AgencyStaffMember>(`/agency/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    // Client management
    getClients: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/agency').AgencyClient[]; total: number }>(`/agency/clients${query}`)
    },

    addClient: (data: { business_email: string; billing_rate_markup?: number }) =>
      baseFetch<import('@/types/agency').AgencyClient>('/agency/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateClient: (id: string, data: Partial<import('@/types/agency').AgencyClient>) =>
      baseFetch<import('@/types/agency').AgencyClient>(`/agency/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
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

    // Billing
    getInvoices: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/agency').Invoice[]; total: number }>(`/agency/invoices${query}`)
    },

    createInvoice: (data: { client_id: string; period_start: string; period_end: string }) =>
      baseFetch<import('@/types/agency').Invoice>('/agency/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getPayroll: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : ''
      return baseFetch<{ items: import('@/types/agency').PayrollEntry[]; total: number }>(`/agency/payroll${query}`)
    },

    getWallet: () => baseFetch<import('@/types/agency').AgencyWallet>('/agency/wallet'),
  },
}
