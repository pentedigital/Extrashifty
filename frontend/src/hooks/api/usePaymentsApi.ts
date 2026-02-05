import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { walletKeys } from './useWalletApi'
import { companyKeys } from './useCompanyApi'

export const paymentKeys = {
  all: ['payments'] as const,
  balance: () => [...paymentKeys.all, 'balance'] as const,
  companyBalance: () => [...paymentKeys.all, 'company-balance'] as const,
  transactionHistory: (params?: { skip?: number; limit?: number }) => [...paymentKeys.all, 'transactions', params] as const,
  autoTopup: () => [...paymentKeys.all, 'auto-topup'] as const,
  paymentIntent: () => [...paymentKeys.all, 'payment-intent'] as const,
  // Earnings and payout keys
  earnings: (period?: string) => [...paymentKeys.all, 'earnings', period] as const,
  earningsSummary: () => [...paymentKeys.all, 'earnings-summary'] as const,
  payoutHistory: (filters?: Record<string, string>) => [...paymentKeys.all, 'payout-history', filters] as const,
  connectStatus: () => [...paymentKeys.all, 'connect-status'] as const,
  connectOnboardingLink: () => [...paymentKeys.all, 'connect-onboarding-link'] as const,
  agencyEarnings: (filters?: Record<string, string>) => [...paymentKeys.all, 'agency-earnings', filters] as const,
}

// Types
export interface WalletBalance {
  available: number
  reserved: number
  total: number
  currency: string
  low_balance_threshold?: number
  is_low_balance?: boolean
}

export interface CompanyWalletBalance {
  id: string
  company_id: string
  available: number
  reserved: number
  total: number
  currency: string
  low_balance_threshold: number
  is_low_balance: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  wallet_id: number
  type: 'top_up' | 'payment' | 'refund' | 'reserve' | 'release'
  amount: number
  description: string
  status: 'pending' | 'completed' | 'failed'
  reference_id: string | null
  shift_id?: number
  created_at: string
}

export interface AutoTopupConfig {
  enabled: boolean
  threshold: number
  amount: number
  payment_method_id?: number
}

export interface PaymentIntent {
  client_secret: string
  amount: number
  currency: string
}

export interface TopupResult {
  transaction_id: number
  amount: number
  status: 'pending' | 'completed' | 'failed'
  new_balance: number
  message: string
}

export interface ReserveFundsResult {
  success: boolean
  reserved_amount: number
  new_available_balance: number
  message: string
}

// Hooks

/**
 * Fetch wallet balance with available, reserved, and total breakdown
 */
export function useWalletBalance() {
  return useQuery({
    queryKey: paymentKeys.companyBalance(),
    queryFn: async (): Promise<CompanyWalletBalance> => {
      const wallet = await api.company.getWallet()
      // Transform the response to include calculated fields
      const available = wallet.balance - (wallet.escrow_balance || 0)
      return {
        id: wallet.id,
        company_id: wallet.company_id,
        available,
        reserved: wallet.escrow_balance || 0,
        total: wallet.balance,
        currency: wallet.currency,
        low_balance_threshold: 100, // Default threshold
        is_low_balance: available < 100,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at,
      }
    },
    staleTime: 1000 * 30, // 30 seconds
  })
}

/**
 * Top up wallet with amount and payment method
 */
export function useTopupWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      amount: number
      payment_method_id?: number
      payment_intent_id?: string
    }): Promise<TopupResult> => {
      // If payment_method_id is provided, use existing flow
      if (data.payment_method_id) {
        return await api.wallet.topUp({
          amount: data.amount,
          payment_method_id: data.payment_method_id,
        })
      }
      // Otherwise, create a payment intent for Stripe Elements
      const result = await api.payments.processTopup({
        amount: data.amount,
        payment_intent_id: data.payment_intent_id,
      })
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.companyBalance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: companyKeys.wallet() })
    },
  })
}

/**
 * Create a payment intent for Stripe Elements
 */
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: async (amount: number): Promise<PaymentIntent> => {
      return await api.payments.createPaymentIntent({ amount })
    },
  })
}

/**
 * Configure auto-topup settings
 */
export function useConfigureAutoTopup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config: AutoTopupConfig): Promise<AutoTopupConfig> => {
      return await api.payments.configureAutoTopup(config)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.autoTopup() })
    },
  })
}

/**
 * Get auto-topup configuration
 */
export function useAutoTopupConfig() {
  return useQuery({
    queryKey: paymentKeys.autoTopup(),
    queryFn: async (): Promise<AutoTopupConfig> => {
      return await api.payments.getAutoTopupConfig()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Reserve funds for a shift acceptance
 */
export function useReserveFunds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      shift_id: number
      amount: number
    }): Promise<ReserveFundsResult> => {
      return await api.payments.reserveFunds(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.companyBalance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
      queryClient.invalidateQueries({ queryKey: companyKeys.wallet() })
    },
  })
}

/**
 * Get transaction history with pagination
 */
export function useTransactionHistory(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: paymentKeys.transactionHistory(params),
    queryFn: async () => {
      return await api.wallet.getTransactions({
        skip: params?.skip,
        limit: params?.limit,
      })
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Check if company has sufficient funds for a shift
 */
export function useCheckFunds(shiftCost: number) {
  const { data: wallet, isLoading } = useWalletBalance()

  const hasSufficientFunds = wallet ? wallet.available >= shiftCost : false
  const shortfall = wallet ? Math.max(0, shiftCost - wallet.available) : shiftCost

  return {
    hasSufficientFunds,
    shortfall,
    available: wallet?.available ?? 0,
    isLoading,
  }
}

// ============================================
// Staff/Agency Earnings and Payout Types
// ============================================

export type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed'
export type ConnectAccountStatus = 'not_started' | 'pending' | 'active' | 'restricted'

export interface EarningEntry {
  id: number
  shift_id: number
  shift_title: string
  date: string
  hours_worked: number
  hourly_rate: number
  amount: number
  status: 'pending' | 'paid'
  paid_at?: string
}

export interface EarningsSummary {
  this_week: number
  this_month: number
  all_time: number
  available_balance: number
  pending_earnings: number
  next_payout_date: string | null
  next_payout_amount: number
}

export interface PayoutRecord {
  id: number
  amount: number
  status: PayoutStatus
  method: string
  method_last_four: string
  created_at: string
  completed_at?: string
  failure_reason?: string
}

export interface ConnectAccountStatusResponse {
  status: ConnectAccountStatus
  is_onboarding_complete: boolean
  payouts_enabled: boolean
  charges_enabled: boolean
  bank_accounts: Array<{
    id: string
    last_four: string
    bank_name: string
    is_default: boolean
  }>
  requirements?: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
  }
}

export interface InstantPayoutRequest {
  amount: number
  bank_account_id: string
}

export interface InstantPayoutResponse {
  id: number
  amount: number
  fee: number
  net_amount: number
  status: PayoutStatus
  estimated_arrival: string
}

export interface AgencyEarningsByStaff {
  staff_id: number
  staff_name: string
  total_earnings: number
  shift_count: number
  hours_worked: number
}

export interface AgencyEarningsByClient {
  client_id: number
  client_name: string
  total_earnings: number
  shift_count: number
  invoice_count: number
}

export interface AgencyEarningsData {
  by_staff: AgencyEarningsByStaff[]
  by_client: AgencyEarningsByClient[]
  total_earnings: number
  period_start: string
  period_end: string
}

// ============================================
// Staff Earnings Hooks
// ============================================

export function useEarnings(period?: string) {
  return useQuery({
    queryKey: paymentKeys.earnings(period),
    queryFn: () => {
      return api.staff.getEarnings(period ? { period } : undefined) as Promise<{
        items: EarningEntry[]
        total: number
        total_gross: number
        total_net: number
      }>
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useEarningsSummary() {
  return useQuery({
    queryKey: paymentKeys.earningsSummary(),
    queryFn: async (): Promise<EarningsSummary> => {
      // For demo, we'll construct this from wallet and earnings data
      const [wallet, earnings] = await Promise.all([
        api.staff.getWallet(),
        api.staff.getEarnings(),
      ])

      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const items = earnings.items || []
      const thisWeek = items
        .filter(e => new Date(e.date) >= weekStart)
        .reduce((sum, e) => sum + e.net_amount, 0)

      const thisMonth = items
        .filter(e => new Date(e.date) >= monthStart)
        .reduce((sum, e) => sum + e.net_amount, 0)

      // Next payout is Friday
      const nextFriday = new Date(now)
      nextFriday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7 || 7)
      nextFriday.setHours(12, 0, 0, 0)

      return {
        this_week: thisWeek,
        this_month: thisMonth,
        all_time: wallet.total_earned ?? earnings.total_net ?? 0,
        available_balance: wallet.balance ?? 0,
        pending_earnings: wallet.pending_earnings ?? 0,
        next_payout_date: nextFriday.toISOString(),
        next_payout_amount: wallet.pending_earnings ?? 0,
      }
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function usePayoutHistory(filters?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: paymentKeys.payoutHistory(filters as Record<string, string>),
    queryFn: async (): Promise<{ items: PayoutRecord[]; total: number }> => {
      // For demo, we'll return mock data based on transaction history
      const transactions = await api.wallet.getTransactions({
        type: 'withdrawal',
        limit: 50,
      })

      const items: PayoutRecord[] = transactions.items.map(t => ({
        id: t.id,
        amount: t.amount,
        status: t.status === 'completed' ? 'paid' : t.status === 'pending' ? 'in_transit' : 'failed',
        method: 'bank_account',
        method_last_four: '1234',
        created_at: t.created_at,
        completed_at: t.status === 'completed' ? t.created_at : undefined,
      }))

      // Apply date filters if provided
      let filteredItems = items
      if (filters?.start_date) {
        const startDate = new Date(filters.start_date)
        filteredItems = filteredItems.filter(i => new Date(i.created_at) >= startDate)
      }
      if (filters?.end_date) {
        const endDate = new Date(filters.end_date)
        filteredItems = filteredItems.filter(i => new Date(i.created_at) <= endDate)
      }

      return { items: filteredItems, total: filteredItems.length }
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useRequestInstantPayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: InstantPayoutRequest): Promise<InstantPayoutResponse> => {
      // For demo, simulate instant payout processing
      const result = await api.wallet.withdraw({
        amount: data.amount,
        payment_method_id: parseInt(data.bank_account_id),
      })

      const fee = data.amount * 0.015 // 1.5% fee
      const netAmount = data.amount - fee

      const now = new Date()
      const estimatedArrival = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes

      return {
        id: result.transaction_id,
        amount: data.amount,
        fee,
        net_amount: netAmount,
        status: 'in_transit',
        estimated_arrival: estimatedArrival.toISOString(),
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() })
    },
  })
}

// ============================================
// Stripe Connect Hooks
// ============================================

export function useConnectAccountStatus() {
  return useQuery({
    queryKey: paymentKeys.connectStatus(),
    queryFn: async (): Promise<ConnectAccountStatusResponse> => {
      // For demo, return mock Connect status
      // In production, this would call a real endpoint
      return {
        status: 'not_started',
        is_onboarding_complete: false,
        payouts_enabled: false,
        charges_enabled: false,
        bank_accounts: [],
      }
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useConnectOnboardingLink() {
  return useMutation({
    mutationFn: async (accountType: 'express' | 'standard'): Promise<{ url: string }> => {
      // For demo, return mock onboarding URL
      // In production, this would call a real endpoint that creates a Stripe Connect onboarding session
      return {
        url: `https://connect.stripe.com/setup/${accountType}/demo`,
      }
    },
  })
}

// ============================================
// Agency Earnings Hooks
// ============================================

export function useAgencyEarnings(filters?: { period?: string; start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: paymentKeys.agencyEarnings(filters as Record<string, string>),
    queryFn: async (): Promise<AgencyEarningsData> => {
      // For demo, construct from existing agency data
      const [staff, clients, wallet] = await Promise.all([
        api.agency.getStaff(),
        api.agency.getClients(),
        api.agency.getWallet(),
      ])

      const now = new Date()
      let periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      let periodEnd = now

      if (filters?.start_date) {
        periodStart = new Date(filters.start_date)
      }
      if (filters?.end_date) {
        periodEnd = new Date(filters.end_date)
      }

      // Mock earnings breakdown by staff
      const byStaff: AgencyEarningsByStaff[] = (staff.items || []).map((s, idx) => ({
        staff_id: parseInt(s.id) || idx + 1,
        staff_name: s.staff?.display_name || s.name || 'Unknown Staff',
        total_earnings: Math.floor(Math.random() * 5000) + 500,
        shift_count: s.shifts_completed || 0,
        hours_worked: s.total_hours || 0,
      }))

      // Mock earnings breakdown by client
      const byClient: AgencyEarningsByClient[] = (clients.items || []).map((c, idx) => ({
        client_id: parseInt(c.id) || idx + 1,
        client_name: c.company?.business_name || c.business_email || 'Unknown Client',
        total_earnings: c.total_billed || Math.floor(Math.random() * 10000) + 1000,
        shift_count: c.shifts_this_month || 0,
        invoice_count: Math.floor(Math.random() * 5) + 1,
      }))

      return {
        by_staff: byStaff,
        by_client: byClient,
        total_earnings: wallet.total_revenue || byClient.reduce((sum, c) => sum + c.total_earnings, 0),
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      }
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useRequestAgencyPayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { amount: number; bank_account_id: string }): Promise<{ id: number; status: string; message: string }> => {
      // For demo, simulate payout request
      return {
        id: Math.floor(Math.random() * 10000),
        status: 'pending',
        message: 'Payout request submitted. Funds will be transferred within 2-3 business days.',
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: ['agency'] })
    },
  })
}
