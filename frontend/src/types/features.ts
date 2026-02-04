// =============================================================================
// Notifications
// =============================================================================

export type NotificationType = 'shift_update' | 'application_update' | 'message' | 'payment' | 'system'
export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  read: boolean
  read_at?: string
  created_at: string
}

export interface NotificationPreferences {
  email_enabled: boolean
  push_enabled: boolean
  sms_enabled: boolean
  shift_updates: boolean
  application_updates: boolean
  payment_updates: boolean
  marketing: boolean
}

// =============================================================================
// Messaging/Chat
// =============================================================================

export type MessageStatus = 'sent' | 'delivered' | 'read'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  status: MessageStatus
  created_at: string
  read_at?: string
}

export interface Conversation {
  id: string
  participants: string[]
  shift_id?: string
  last_message?: Message
  unread_count: number
  created_at: string
  updated_at: string
}

// =============================================================================
// Audit Logs
// =============================================================================

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view'
export type AuditEntity = 'user' | 'shift' | 'application' | 'payment' | 'company' | 'agency'

export interface AuditLog {
  id: string
  user_id: string
  action: AuditAction
  entity: AuditEntity
  entity_id: string
  changes?: Record<string, { old: unknown; new: unknown }>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// =============================================================================
// MFA (Multi-Factor Authentication)
// =============================================================================

export type MFAMethod = 'totp' | 'sms' | 'email'

export interface MFASetup {
  method: MFAMethod
  secret?: string
  qr_code?: string
  backup_codes?: string[]
}

export interface MFAVerification {
  method: MFAMethod
  code: string
}

// =============================================================================
// Payments/Transactions
// =============================================================================

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'escrow_hold' | 'escrow_release'
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Transaction {
  id: string
  wallet_id: string
  type: TransactionType
  amount: number
  currency: string
  status: TransactionStatus
  reference?: string
  description?: string
  metadata?: Record<string, unknown>
  created_at: string
  completed_at?: string
}

export interface Payout {
  id: string
  user_id: string
  amount: number
  currency: string
  status: PayoutStatus
  bank_account_last4?: string
  created_at: string
  processed_at?: string
}

// =============================================================================
// Escrow
// =============================================================================

export type EscrowStatus = 'held' | 'released' | 'refunded' | 'disputed'

export interface EscrowAccount {
  id: string
  shift_id: string
  company_id: string
  staff_id?: string
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
  id: string
  user_id: string
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
