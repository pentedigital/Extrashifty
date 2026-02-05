import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { walletKeys, useWalletBalance } from './useWalletApi'
import { companyKeys } from './useCompanyApi'
import type {
  WalletBalance,
  SettlementSplit,
  SettlementResponse,
  CancellationResponse,
  PayoutStatus,
} from '@/types/payment'

// Re-export types for backwards compatibility
export type { WalletBalance, SettlementSplit, SettlementResponse, CancellationResponse, PayoutStatus }

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
export interface CompanyWalletBalance {
  id: number
  company_id: number
  available: number
  reserved: number
  total: number
  currency: string
  low_balance_threshold: number
  is_low_balance: boolean
  created_at: string
  updated_at: string
}

export interface AutoTopupConfig {
  enabled: boolean
  threshold: number
  amount: number
  payment_method_id?: number
}

export interface TopupResult {
  transaction_id: number
  amount: number
  status: 'pending' | 'completed' | 'failed'
  new_balance: number
  message: string
}

export interface ReserveFundsResult {
  hold_id: number
  shift_id: number
  amount_reserved: number
  remaining_balance: number
  expires_at: string
  message: string
}

// Hooks

/**
 * Fetch company wallet balance with available, reserved, and total breakdown
 * Note: For generic user wallet balance, use useWalletBalance from useWalletApi.ts
 */
export function useCompanyWalletBalance() {
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
 * Uses the /payments/wallets/topup endpoint for the full payment flow
 */
export function useTopupWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      amount: number
      payment_method_id: number
      idempotency_key?: string
    }): Promise<TopupResult> => {
      // Use the payments API for topup (integrates with Stripe)
      const result = await api.payments.topupWallet({
        amount: data.amount,
        payment_method_id: data.payment_method_id,
        idempotency_key: data.idempotency_key,
      })
      return {
        transaction_id: result.transaction_id,
        amount: result.amount,
        status: result.status as 'pending' | 'completed' | 'failed',
        new_balance: result.new_balance,
        message: result.message,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.companyBalance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: companyKeys.wallet() })
    },
    onError: (error) => {
      console.error('Failed to top up wallet:', error)
    },
  })
}

/**
 * Create a Stripe PaymentIntent for card-based top-ups
 */
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: async (amount: number) => {
      return await api.payments.createPaymentIntent(amount)
    },
    onError: (error) => {
      console.error('Failed to create payment intent:', error)
    },
  })
}

/**
 * Get current auto-topup configuration
 */
export function useAutoTopupConfig() {
  return useQuery({
    queryKey: paymentKeys.autoTopup(),
    queryFn: async (): Promise<AutoTopupConfig> => {
      const result = await api.payments.getAutoTopupConfig()
      return {
        enabled: result.enabled,
        threshold: result.threshold ?? 0,
        amount: result.topup_amount ?? 0,
        payment_method_id: result.payment_method_id ?? undefined,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Configure auto-topup settings
 * When enabled, wallet is automatically topped up when balance falls below threshold
 */
export function useConfigureAutoTopup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config: {
      enabled: boolean
      threshold?: number
      topup_amount?: number
      payment_method_id?: number
    }): Promise<AutoTopupConfig> => {
      const result = await api.payments.configureAutoTopup(config)
      return {
        enabled: result.enabled,
        threshold: result.threshold ?? 0,
        amount: result.topup_amount ?? 0,
        payment_method_id: result.payment_method_id ?? undefined,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.autoTopup() })
    },
    onError: (error) => {
      console.error('Failed to configure auto-topup:', error)
    },
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
      idempotency_key?: string
    }): Promise<ReserveFundsResult> => {
      return await api.payments.reserveFunds(data.shift_id, { idempotency_key: data.idempotency_key })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.companyBalance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
      queryClient.invalidateQueries({ queryKey: companyKeys.wallet() })
    },
    onError: (error) => {
      console.error('Failed to reserve funds:', error)
    },
  })
}

/**
 * Settle payment after shift completion
 * Called when clock-out is approved or after 24hr auto-approve
 * Payment split: 15% platform fee, 85% to worker/agency
 */
export function useSettleShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      shift_id: number
      actual_hours: number
    }): Promise<SettlementResponse> => {
      return await api.payments.settleShift(data.shift_id, data.actual_hours)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.companyBalance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: companyKeys.wallet() })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
    onError: (error) => {
      console.error('Failed to settle shift payment:', error)
    },
  })
}

/**
 * Cancel shift and process refund/compensation
 *
 * Cancellation policy based on timing:
 * - >= 48 hours before shift: Full refund
 * - >= 24 hours before shift: 50% refund
 * - < 24 hours (company cancels): Worker gets 2 hours pay
 * - < 24 hours (worker cancels): Full refund to company
 */
export function useCancelShiftPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      shift_id: number
      cancelled_by: 'company' | 'worker' | 'platform'
      reason?: string
      idempotency_key?: string
    }): Promise<CancellationResponse> => {
      return await api.payments.cancelShift(data.shift_id, {
        cancelled_by: data.cancelled_by,
        reason: data.reason,
        idempotency_key: data.idempotency_key,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.companyBalance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: companyKeys.wallet() })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
    onError: (error) => {
      console.error('Failed to cancel shift payment:', error)
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

// PayoutStatus is imported from @/types/payment
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
    onError: (error) => {
      console.error('Failed to request instant payout:', error)
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
      // Call real API endpoint for Stripe Connect onboarding
      // Falls back to demo URL if API not available
      try {
        // TODO: Replace with real API call when endpoint is available
        // return await api.payments.getConnectOnboardingLink(accountType)
        return {
          url: `https://connect.stripe.com/setup/${accountType}/demo`,
        }
      } catch {
        return {
          url: `https://connect.stripe.com/setup/${accountType}/demo`,
        }
      }
    },
    onError: (error) => {
      console.error('Failed to get Connect onboarding link:', error)
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
        staff_id: s.id || idx + 1,
        staff_name: s.staff?.display_name || s.name || 'Unknown Staff',
        total_earnings: Math.floor(Math.random() * 5000) + 500,
        shift_count: s.shifts_completed || 0,
        hours_worked: s.total_hours || 0,
      }))

      // Mock earnings breakdown by client
      const byClient: AgencyEarningsByClient[] = (clients.items || []).map((c, idx) => ({
        client_id: c.id || idx + 1,
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
      // TODO: Replace with real API call when endpoint is available
      // return await api.agency.requestPayout(data)
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
    onError: (error) => {
      console.error('Failed to request agency payout:', error)
    },
  })
}
