/**
 * Mock API client for frontend-first development
 * Replace with real API calls when backend is ready
 */

import type {
  Notification,
  NotificationPreferences,
  Message,
  Conversation,
  Transaction,
  Payout,
  EscrowAccount,
  VerificationDocument,
  VerificationStatus,
} from '@/types/features'
import type { StaffWallet, ClockRecord } from '@/types/staff'
import type { CompanyWallet } from '@/types/company'

// Simulated delay for mock API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Mock data generators
const generateId = () => Math.random().toString(36).substring(2, 11)

export const mockApi = {
  // ==================== WALLET ====================
  wallet: {
    getBalance: async (): Promise<{ balance: number; pending: number; currency: string }> => {
      await delay(300)
      return { balance: 1250.50, pending: 180.00, currency: 'EUR' }
    },

    getStaffWallet: async (): Promise<StaffWallet> => {
      await delay(300)
      return {
        id: generateId(),
        staff_id: 'current-user',
        balance: 1250.50,
        currency: 'EUR',
        pending_earnings: 180.00,
        total_earned: 8450.00,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      }
    },

    getCompanyWallet: async (): Promise<CompanyWallet> => {
      await delay(300)
      return {
        id: generateId(),
        company_id: 'current-company',
        balance: 5000.00,
        currency: 'EUR',
        escrow_balance: 1200.00,
        total_spent: 15600.00,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      }
    },

    getTransactions: async (): Promise<Transaction[]> => {
      await delay(400)
      return [
        {
          id: generateId(),
          wallet_id: 'w1',
          type: 'payment',
          amount: 144.00,
          currency: 'EUR',
          status: 'completed',
          description: 'Shift payment - Bartender @ The Brazen Head',
          created_at: '2026-02-01T18:00:00Z',
          completed_at: '2026-02-01T18:05:00Z',
        },
        {
          id: generateId(),
          wallet_id: 'w1',
          type: 'payment',
          amount: 128.00,
          currency: 'EUR',
          status: 'completed',
          description: 'Shift payment - Server @ Restaurant XYZ',
          created_at: '2026-01-28T20:00:00Z',
          completed_at: '2026-01-28T20:05:00Z',
        },
        {
          id: generateId(),
          wallet_id: 'w1',
          type: 'withdrawal',
          amount: -500.00,
          currency: 'EUR',
          status: 'completed',
          description: 'Bank withdrawal',
          created_at: '2026-01-25T10:00:00Z',
          completed_at: '2026-01-26T09:00:00Z',
        },
        {
          id: generateId(),
          wallet_id: 'w1',
          type: 'payment',
          amount: 180.00,
          currency: 'EUR',
          status: 'pending',
          description: 'Shift payment - Line Cook @ Hotel Dublin (pending approval)',
          created_at: '2026-02-03T14:00:00Z',
        },
      ]
    },

    withdraw: async (_amount: number): Promise<{ success: boolean; payout_id: string }> => {
      await delay(500)
      return { success: true, payout_id: generateId() }
    },
  },

  // ==================== TIME TRACKING ====================
  time: {
    clockIn: async (shiftId: string): Promise<ClockRecord> => {
      await delay(300)
      return {
        id: generateId(),
        shift_id: shiftId,
        staff_id: 'current-user',
        clock_in: new Date().toISOString(),
        status: 'clocked_in',
        created_at: new Date().toISOString(),
      }
    },

    clockOut: async (shiftId: string): Promise<ClockRecord> => {
      await delay(300)
      const clockIn = new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      return {
        id: generateId(),
        shift_id: shiftId,
        staff_id: 'current-user',
        clock_in: clockIn.toISOString(),
        clock_out: new Date().toISOString(),
        total_hours: 6,
        status: 'clocked_out',
        created_at: clockIn.toISOString(),
      }
    },

    getRecords: async (): Promise<ClockRecord[]> => {
      await delay(400)
      return [
        {
          id: generateId(),
          shift_id: 's1',
          staff_id: 'current-user',
          clock_in: '2026-02-03T18:02:00Z',
          clock_out: '2026-02-04T00:05:00Z',
          total_hours: 6.05,
          status: 'approved',
          created_at: '2026-02-03T18:02:00Z',
        },
        {
          id: generateId(),
          shift_id: 's2',
          staff_id: 'current-user',
          clock_in: '2026-02-01T12:00:00Z',
          clock_out: '2026-02-01T20:10:00Z',
          total_hours: 8.17,
          status: 'approved',
          created_at: '2026-02-01T12:00:00Z',
        },
        {
          id: generateId(),
          shift_id: 's3',
          staff_id: 'current-user',
          clock_in: '2026-01-28T18:05:00Z',
          clock_out: '2026-01-29T00:00:00Z',
          total_hours: 5.92,
          status: 'disputed',
          notes: 'Clock-in time disputed by manager',
          created_at: '2026-01-28T18:05:00Z',
        },
      ]
    },

    getCurrentShift: async (): Promise<{ clocked_in: boolean; shift_id?: string; clock_record?: ClockRecord } | null> => {
      await delay(200)
      // Simulate not clocked in currently
      return { clocked_in: false }
    },
  },

  // ==================== NOTIFICATIONS ====================
  notifications: {
    list: async (): Promise<Notification[]> => {
      await delay(300)
      return [
        {
          id: generateId(),
          user_id: 'current-user',
          type: 'application_update',
          title: 'Application Accepted',
          body: 'Your application for Bartender at The Brazen Head has been accepted!',
          read: false,
          created_at: '2026-02-04T10:30:00Z',
        },
        {
          id: generateId(),
          user_id: 'current-user',
          type: 'shift_update',
          title: 'Shift Reminder',
          body: 'Your shift at Restaurant XYZ starts tomorrow at 12:00 PM',
          read: false,
          created_at: '2026-02-04T09:00:00Z',
        },
        {
          id: generateId(),
          user_id: 'current-user',
          type: 'payment',
          title: 'Payment Received',
          body: 'You received €144.00 for your shift on Feb 1st',
          read: true,
          read_at: '2026-02-02T08:00:00Z',
          created_at: '2026-02-01T20:00:00Z',
        },
        {
          id: generateId(),
          user_id: 'current-user',
          type: 'message',
          title: 'New Message',
          body: 'You have a new message from The Brazen Head',
          read: true,
          read_at: '2026-01-30T15:00:00Z',
          created_at: '2026-01-30T14:30:00Z',
        },
      ]
    },

    markAsRead: async (_id: string): Promise<{ success: boolean }> => {
      await delay(200)
      return { success: true }
    },

    markAllAsRead: async (): Promise<{ success: boolean }> => {
      await delay(300)
      return { success: true }
    },

    getPreferences: async (): Promise<NotificationPreferences> => {
      await delay(200)
      return {
        email_enabled: true,
        push_enabled: true,
        sms_enabled: false,
        shift_updates: true,
        application_updates: true,
        payment_updates: true,
        marketing: false,
      }
    },

    updatePreferences: async (prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
      await delay(300)
      return {
        email_enabled: true,
        push_enabled: true,
        sms_enabled: false,
        shift_updates: true,
        application_updates: true,
        payment_updates: true,
        marketing: false,
        ...prefs,
      }
    },
  },

  // ==================== MESSAGING ====================
  messages: {
    getConversations: async (): Promise<Conversation[]> => {
      await delay(400)
      return [
        {
          id: 'conv1',
          participants: ['current-user', 'brazen-head'],
          shift_id: 's1',
          last_message: {
            id: 'm1',
            conversation_id: 'conv1',
            sender_id: 'brazen-head',
            content: 'Looking forward to seeing you tonight!',
            status: 'delivered',
            created_at: '2026-02-04T14:30:00Z',
          },
          unread_count: 1,
          created_at: '2026-02-01T10:00:00Z',
          updated_at: '2026-02-04T14:30:00Z',
        },
        {
          id: 'conv2',
          participants: ['current-user', 'restaurant-xyz'],
          last_message: {
            id: 'm2',
            conversation_id: 'conv2',
            sender_id: 'current-user',
            content: 'Thank you for the opportunity!',
            status: 'read',
            created_at: '2026-02-02T09:00:00Z',
            read_at: '2026-02-02T09:15:00Z',
          },
          unread_count: 0,
          created_at: '2026-01-25T14:00:00Z',
          updated_at: '2026-02-02T09:15:00Z',
        },
      ]
    },

    getMessages: async (conversationId: string): Promise<Message[]> => {
      await delay(300)
      return [
        {
          id: 'm1',
          conversation_id: conversationId,
          sender_id: 'other-user',
          content: 'Hi! We saw your application and would love to have you join us.',
          status: 'read',
          created_at: '2026-02-01T10:00:00Z',
          read_at: '2026-02-01T10:05:00Z',
        },
        {
          id: 'm2',
          conversation_id: conversationId,
          sender_id: 'current-user',
          content: 'Thank you! I am very excited about this opportunity.',
          status: 'read',
          created_at: '2026-02-01T10:10:00Z',
          read_at: '2026-02-01T10:12:00Z',
        },
        {
          id: 'm3',
          conversation_id: conversationId,
          sender_id: 'other-user',
          content: 'Looking forward to seeing you tonight!',
          status: 'delivered',
          created_at: '2026-02-04T14:30:00Z',
        },
      ]
    },

    send: async (conversationId: string, content: string): Promise<Message> => {
      await delay(300)
      return {
        id: generateId(),
        conversation_id: conversationId,
        sender_id: 'current-user',
        content,
        status: 'sent',
        created_at: new Date().toISOString(),
      }
    },
  },

  // ==================== RATINGS ====================
  ratings: {
    getForStaff: async (_staffId: string): Promise<{ average: number; count: number; reviews: Array<{ id: string; rating: number; comment?: string; company_name: string; created_at: string }> }> => {
      await delay(400)
      return {
        average: 4.8,
        count: 32,
        reviews: [
          { id: 'r1', rating: 5, comment: 'Excellent work! Very professional.', company_name: 'The Brazen Head', created_at: '2026-02-01T20:00:00Z' },
          { id: 'r2', rating: 5, comment: 'Great attitude and skills.', company_name: 'Restaurant XYZ', created_at: '2026-01-28T20:00:00Z' },
          { id: 'r3', rating: 4, comment: 'Good work overall.', company_name: 'Hotel Dublin', created_at: '2026-01-20T14:00:00Z' },
        ],
      }
    },

    getForCompany: async (_companyId: string): Promise<{ average: number; count: number; reviews: Array<{ id: string; rating: number; comment?: string; staff_name: string; created_at: string }> }> => {
      await delay(400)
      return {
        average: 4.7,
        count: 124,
        reviews: [
          { id: 'r1', rating: 5, comment: 'Great place to work!', staff_name: 'John D.', created_at: '2026-02-01T20:00:00Z' },
          { id: 'r2', rating: 4, comment: 'Good management, busy shifts.', staff_name: 'Maria S.', created_at: '2026-01-25T20:00:00Z' },
        ],
      }
    },

    submit: async (_data: { shift_id: string; rating: number; comment?: string }): Promise<{ success: boolean }> => {
      await delay(300)
      return { success: true }
    },
  },

  // ==================== VERIFICATION ====================
  verification: {
    getStatus: async (): Promise<VerificationStatus> => {
      await delay(300)
      return {
        id_verified: true,
        background_checked: false,
        right_to_work_verified: true,
        documents: [
          {
            id: 'd1',
            user_id: 'current-user',
            type: 'passport',
            status: 'approved',
            expires_at: '2030-01-15T00:00:00Z',
            reviewed_at: '2025-06-01T10:00:00Z',
            created_at: '2025-05-28T14:00:00Z',
            updated_at: '2025-06-01T10:00:00Z',
          },
          {
            id: 'd2',
            user_id: 'current-user',
            type: 'right_to_work',
            status: 'approved',
            expires_at: '2027-12-31T00:00:00Z',
            reviewed_at: '2025-06-02T09:00:00Z',
            created_at: '2025-05-28T14:30:00Z',
            updated_at: '2025-06-02T09:00:00Z',
          },
          {
            id: 'd3',
            user_id: 'current-user',
            type: 'background_check',
            status: 'pending',
            created_at: '2026-02-01T10:00:00Z',
            updated_at: '2026-02-01T10:00:00Z',
          },
        ],
      }
    },

    uploadDocument: async (type: string, _file: File): Promise<VerificationDocument> => {
      await delay(500)
      return {
        id: generateId(),
        user_id: 'current-user',
        type: type as VerificationDocument['type'],
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    },
  },

  // ==================== ESCROW ====================
  escrow: {
    getForShift: async (shiftId: string): Promise<EscrowAccount | null> => {
      await delay(300)
      return {
        id: generateId(),
        shift_id: shiftId,
        company_id: 'company-1',
        staff_id: 'current-user',
        amount: 144.00,
        currency: 'EUR',
        status: 'held',
        held_at: '2026-02-04T18:00:00Z',
      }
    },
  },

  // ==================== PAYOUTS ====================
  payouts: {
    list: async (): Promise<Payout[]> => {
      await delay(400)
      return [
        {
          id: generateId(),
          user_id: 'current-user',
          amount: 500.00,
          currency: 'EUR',
          status: 'completed',
          bank_account_last4: '4567',
          created_at: '2026-01-25T10:00:00Z',
          processed_at: '2026-01-26T09:00:00Z',
        },
        {
          id: generateId(),
          user_id: 'current-user',
          amount: 350.00,
          currency: 'EUR',
          status: 'completed',
          bank_account_last4: '4567',
          created_at: '2026-01-10T10:00:00Z',
          processed_at: '2026-01-11T09:00:00Z',
        },
      ]
    },

    request: async (amount: number): Promise<Payout> => {
      await delay(500)
      return {
        id: generateId(),
        user_id: 'current-user',
        amount,
        currency: 'EUR',
        status: 'pending',
        bank_account_last4: '4567',
        created_at: new Date().toISOString(),
      }
    },
  },
}
