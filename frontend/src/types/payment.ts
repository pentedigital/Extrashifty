/**
 * Payment types for ExtraShifty frontend
 * These types match the backend schemas in /backend/app/schemas/payment.py and /backend/app/schemas/wallet.py
 */

// =============================================================================
// Transaction Types (matches backend TransactionType enum)
// =============================================================================

/**
 * Backend transaction types (from backend/app/schemas/payment.py)
 */
export type BackendTransactionType =
  | 'topup'           // Adding funds to wallet
  | 'reserve'         // Reserving funds for accepted shift
  | 'release'         // Releasing reserved funds back to available
  | 'settlement'      // Paying staff after shift completion
  | 'commission'      // Platform commission fee
  | 'payout'          // Withdrawal to bank account
  | 'refund'          // Refund to company wallet
  | 'cancellation_fee' // Fee for late cancellation
  | 'penalty'         // Penalty deduction

/**
 * UI-friendly transaction types for frontend display
 * These map to backend types but use more user-friendly names
 */
export type UITransactionType =
  | 'earning'         // Staff earnings from shifts
  | 'withdrawal'      // Withdrawal to bank account (maps to 'payout')
  | 'top_up'          // Adding funds (maps to 'topup')
  | 'payment'         // Payment for services

/**
 * Combined transaction type that supports both backend and UI types
 * Use this for type-safe handling across the application
 */
export type TransactionType = BackendTransactionType | UITransactionType

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

// =============================================================================
// Payout Types (matches backend PayoutStatus and PayoutType enums)
// =============================================================================

export type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled'
export type PayoutType = 'weekly' | 'instant'

// =============================================================================
// Payment Method Types (matches backend PaymentMethodType enum)
// =============================================================================

export type PaymentMethodType = 'card' | 'bank_account' | 'ach'

// =============================================================================
// Wallet Types (matches backend WalletType and WalletStatus enums)
// =============================================================================

export type WalletType = 'company' | 'staff' | 'agency' | 'platform'
export type WalletStatus = 'active' | 'grace_period' | 'suspended'

// =============================================================================
// Cancellation Types (matches backend CancellationPolicy and CancelledBy enums)
// =============================================================================

export type CancellationPolicy = 'full_refund' | 'partial_refund' | 'no_refund' | 'worker_compensation'
export type CancelledBy = 'company' | 'worker' | 'platform'

// =============================================================================
// Wallet Balance Response (matches backend BalanceResponse)
// =============================================================================

export interface WalletBalance {
  wallet_id?: number
  available: number
  reserved: number
  pending_payout?: number
  total: number
  currency: string
  low_balance_threshold?: number
  is_low_balance?: boolean
}

// =============================================================================
// Top-up Request/Response (matches backend TopupRequest/TopupResponse)
// =============================================================================

export interface TopupRequest {
  amount: number
  payment_method_id: number
  idempotency_key?: string
}

export interface TopupResponse {
  transaction_id: number
  amount: number
  new_balance: number
  status: string
  message: string
}

// =============================================================================
// Auto Top-up Configuration (matches backend AutoTopupConfigRequest/Response)
// =============================================================================

export interface AutoTopupConfig {
  enabled: boolean
  threshold?: number
  topup_amount?: number
  payment_method_id?: number
}

export interface AutoTopupConfigResponse extends AutoTopupConfig {
  message: string
}

// =============================================================================
// Reserve Request/Response (matches backend ReserveRequest/ReserveResponse)
// =============================================================================

export interface ReserveRequest {
  idempotency_key?: string
}

export interface ReserveResponse {
  hold_id: number
  shift_id: number
  amount_reserved: number
  remaining_balance: number
  expires_at: string
  message: string
}

// =============================================================================
// Insufficient Funds Response (matches backend InsufficientFundsResponse)
// =============================================================================

export interface InsufficientFundsError {
  error: 'insufficient_funds'
  required_amount: number
  available_amount: number
  shortfall: number
  minimum_balance?: number
  message: string
}

// =============================================================================
// Settlement Types (matches backend SettlementSplit/SettlementResponse)
// =============================================================================

export interface SettlementSplit {
  gross_amount: number
  platform_fee: number
  platform_fee_rate: number
  worker_amount: number
  agency_fee?: number
}

export interface SettlementResponse {
  shift_id: number
  settlement_id: number
  actual_hours: number
  gross_amount: number
  split: SettlementSplit
  transactions: Array<{
    transaction_id: number
    type: string
    amount: string
    fee?: string
    net_amount?: string
  }>
  message: string
}

// =============================================================================
// Cancellation Types (matches backend CancellationRequest/CancellationResponse)
// =============================================================================

export interface CancellationRequest {
  cancelled_by: CancelledBy
  reason?: string
  idempotency_key?: string
}

export interface CancellationResponse {
  shift_id: number
  cancelled_by: CancelledBy
  policy_applied: CancellationPolicy
  refund_amount: number
  worker_compensation: number
  transactions: Array<{
    transaction_id: number
    type: string
    amount: string
  }>
  message: string
}

// =============================================================================
// Payout Types (matches backend PayoutRequest/PayoutResponse)
// =============================================================================

export interface PayoutRequest {
  amount?: number
  idempotency_key?: string
}

export interface PayoutResponse {
  payout_id: number
  amount: number
  fee: number
  net_amount: number
  status: PayoutStatus
  estimated_arrival?: string
  message: string
}

// =============================================================================
// Payout Schedule (matches backend PayoutScheduleResponse)
// =============================================================================

export interface PayoutScheduleItem {
  scheduled_date: string
  estimated_amount: number
  status: string
}

export interface PayoutScheduleResponse {
  next_payout_date?: string
  minimum_threshold: number
  current_balance: number
  scheduled_payouts: PayoutScheduleItem[]
}

// =============================================================================
// Payout History (matches backend PayoutHistoryItem/PayoutHistoryResponse)
// =============================================================================

export interface PayoutHistoryItem {
  payout_id: number
  amount: number
  fee: number
  net_amount: number
  status: PayoutStatus
  payout_type: PayoutType
  created_at: string
  completed_at?: string
}

export interface PayoutHistoryResponse {
  items: PayoutHistoryItem[]
  total: number
}

// =============================================================================
// Minimum Balance (matches backend MinimumBalanceRequest/MinimumBalanceResponse)
// =============================================================================

export interface MinimumBalanceRequest {
  minimum_balance: number
}

export interface MinimumBalanceResponse {
  wallet_id: number
  minimum_balance: number
  available_balance: number
  message: string
}

// =============================================================================
// Wallet Status Response
// =============================================================================

export interface WalletStatusResponse {
  wallet_id: number
  status: WalletStatus
  is_active: boolean
  can_accept_shifts: boolean
  grace_period_ends_at?: string
  last_failed_topup_at?: string
  suspension_reason?: string
}

// =============================================================================
// Payment Method (matches backend PaymentMethodRead)
// =============================================================================

export interface PaymentMethod {
  id: number
  user_id: number
  type: PaymentMethodType
  last_four: string
  brand?: string
  is_default: boolean
  created_at: string
}

// =============================================================================
// Transaction (matches backend TransactionRead)
// =============================================================================

export interface Transaction {
  id: number
  wallet_id: number
  type: TransactionType
  amount: number
  description: string
  status: TransactionStatus
  reference_id?: string
  created_at: string
}

// =============================================================================
// Wallet (matches backend WalletRead)
// =============================================================================

export interface Wallet {
  id: number
  user_id: number
  balance: number
  currency: string
  created_at: string
  updated_at: string
}
