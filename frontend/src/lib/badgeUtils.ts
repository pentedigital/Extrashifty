import type { ShiftStatus } from '@/types/shift'
import type { ApplicationStatus } from '@/types/application'
import type { InvoiceStatus, PayrollStatus } from '@/types/agency'
import type { TransactionStatus } from '@/hooks/api/useWalletApi'
import type { PayoutStatus } from '@/hooks/api/usePaymentsApi'

// Badge configuration type
export interface BadgeConfig {
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  label: string
}

/**
 * Get badge configuration for shift status
 * @param status - The shift status
 * @param spotsTotal - Optional: total spots for the shift (for "open" status variations)
 * @param spotsFilled - Optional: filled spots for the shift (for "open" status variations)
 * @returns Badge configuration with variant and label
 */
export function getShiftStatusBadge(
  status: ShiftStatus | string,
  spotsTotal?: number,
  spotsFilled?: number
): BadgeConfig {
  // Handle "open" status with spots information
  if (status === 'open' && spotsTotal !== undefined && spotsFilled !== undefined) {
    if (spotsFilled === spotsTotal) {
      return { variant: 'success', label: 'Filled' }
    }
    if (spotsFilled > 0) {
      return { variant: 'warning', label: `${spotsTotal - spotsFilled} Open` }
    }
    return { variant: 'success', label: 'Open' }
  }

  switch (status) {
    case 'draft':
      return { variant: 'outline', label: 'Draft' }
    case 'open':
      return { variant: 'success', label: 'Open' }
    case 'assigned':
    case 'filled':
      return { variant: 'success', label: 'Filled' }
    case 'confirmed':
      return { variant: 'success', label: 'Confirmed' }
    case 'in_progress':
      return { variant: 'warning', label: 'In Progress' }
    case 'completed':
      return { variant: 'secondary', label: 'Completed' }
    case 'cancelled':
      return { variant: 'destructive', label: 'Cancelled' }
    default:
      return { variant: 'secondary', label: status }
  }
}

/**
 * Get badge configuration for application status
 * @param status - The application status
 * @returns Badge configuration with variant and label
 */
export function getApplicationStatusBadge(status: ApplicationStatus | string): BadgeConfig {
  switch (status) {
    case 'pending':
      return { variant: 'warning', label: 'Pending' }
    case 'accepted':
      return { variant: 'success', label: 'Accepted' }
    case 'rejected':
      return { variant: 'destructive', label: 'Rejected' }
    case 'withdrawn':
      return { variant: 'secondary', label: 'Withdrawn' }
    default:
      return { variant: 'secondary', label: status }
  }
}

/**
 * Get badge configuration for invoice status
 * @param status - The invoice status
 * @returns Badge configuration with variant and label
 */
export function getInvoiceStatusBadge(status: InvoiceStatus | string): BadgeConfig {
  switch (status) {
    case 'draft':
      return { variant: 'outline', label: 'Draft' }
    case 'sent':
      return { variant: 'default', label: 'Sent' }
    case 'paid':
      return { variant: 'success', label: 'Paid' }
    case 'overdue':
      return { variant: 'destructive', label: 'Overdue' }
    case 'cancelled':
      return { variant: 'destructive', label: 'Cancelled' }
    default:
      return { variant: 'secondary', label: status }
  }
}

/**
 * Get badge configuration for payroll status
 * @param status - The payroll status
 * @returns Badge configuration with variant and label
 */
export function getPayrollStatusBadge(status: PayrollStatus | string): BadgeConfig {
  switch (status) {
    case 'pending':
      return { variant: 'warning', label: 'Pending' }
    case 'approved':
      return { variant: 'default', label: 'Approved' }
    case 'paid':
      return { variant: 'success', label: 'Paid' }
    default:
      return { variant: 'secondary', label: status }
  }
}

/**
 * Get badge configuration for transaction status
 * @param status - The transaction status
 * @returns Badge configuration with variant and label
 */
export function getTransactionStatusBadge(status: TransactionStatus | string): BadgeConfig {
  switch (status) {
    case 'pending':
      return { variant: 'warning', label: 'Pending' }
    case 'completed':
      return { variant: 'success', label: 'Completed' }
    case 'failed':
      return { variant: 'destructive', label: 'Failed' }
    default:
      return { variant: 'secondary', label: status }
  }
}

/**
 * Get badge configuration for payout status
 * @param status - The payout status
 * @returns Badge configuration with variant and label
 */
export function getPayoutStatusBadge(status: PayoutStatus | string): BadgeConfig {
  switch (status) {
    case 'pending':
      return { variant: 'warning', label: 'Pending' }
    case 'in_transit':
    case 'processing':
      return { variant: 'default', label: 'Processing' }
    case 'paid':
      return { variant: 'success', label: 'Completed' }
    case 'failed':
      return { variant: 'destructive', label: 'Failed' }
    default:
      return { variant: 'outline', label: status }
  }
}
