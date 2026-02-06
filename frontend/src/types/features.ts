// Import payment types for use in extended feature interfaces
import type { TransactionType, TransactionStatus, PayoutStatus } from './payment'

// =============================================================================
// Notifications
// =============================================================================

// NOTE: For TransactionType, TransactionStatus, PayoutStatus - import directly from '@/types/payment'

export type NotificationType = 'shift_update' | 'application_update' | 'message' | 'payment' | 'system'
export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push'

/**
 * Notification interface - matches API response format from useNotificationsApi
 * Uses `message` and `is_read` to match backend response
 */
export interface Notification {
  id: number
  user_id: number
  type: NotificationType | string
  title: string
  message: string  // API uses 'message', not 'body'
  data?: Record<string, unknown> | null
  is_read: boolean  // API uses 'is_read', not 'read'
  created_at: string
}

export interface NotificationPreferences {
  id?: number
  user_id?: number
  email_enabled: boolean
  push_enabled: boolean
  sms_enabled?: boolean
  shift_updates: boolean
  application_updates?: boolean
  payment_updates: boolean
  marketing: boolean
}

// =============================================================================
// Messaging/Chat
// =============================================================================

export type MessageStatus = 'sent' | 'delivered' | 'read'

export interface Message {
  id: number
  conversation_id: number
  sender_id: number
  content: string
  status: MessageStatus
  created_at: string
  read_at?: string
}

export interface Conversation {
  id: number
  participants: number[]
  shift_id?: number
  last_message?: Message
  unread_count: number
  created_at: string
  updated_at: string
}

// =============================================================================
// Payments/Transactions
// =============================================================================

// TransactionType, TransactionStatus, and PayoutStatus are imported from payment.ts above.
// The payment.ts definitions are authoritative as they match the backend schemas.

// Extended transaction interface for feature-specific use cases (e.g., mock API)
// This extends the base Transaction with additional fields needed by frontend features.
export interface FeatureTransaction {
  id: number | string
  wallet_id: number | string
  type: TransactionType | 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'escrow_hold' | 'escrow_release'
  amount: number
  currency: string
  status: TransactionStatus | 'processing'
  reference?: string
  description?: string
  metadata?: Record<string, unknown>
  created_at: string
  completed_at?: string
}

export interface FeaturePayout {
  id: number | string
  user_id: number | string
  amount: number
  currency: string
  status: PayoutStatus | 'processing'
  bank_account_last4?: string
  created_at: string
  processed_at?: string
}

// =============================================================================
// Escrow
// =============================================================================

export type EscrowStatus = 'held' | 'released' | 'refunded' | 'disputed'

export interface EscrowAccount {
  id: number
  shift_id: number
  company_id: number
  staff_id?: number
  amount: number
  currency: string
  status: EscrowStatus
  held_at: string
  released_at?: string
}

// =============================================================================
// Verification Documents
// =============================================================================

export type DocumentType = 'id_card' | 'passport' | 'drivers_license' | 'right_to_work' | 'background_check' | 'certification'
export type DocumentStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired'

export interface VerificationDocument {
  id: number
  user_id: number
  type: DocumentType
  status: DocumentStatus
  file_url?: string
  expires_at?: string
  reviewed_at?: string
  reviewer_notes?: string
  created_at: string
  updated_at: string
}

export interface VerificationStatus {
  id_verified: boolean
  background_checked: boolean
  right_to_work_verified: boolean
  documents: VerificationDocument[]
}
