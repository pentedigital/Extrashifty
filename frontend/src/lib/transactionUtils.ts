import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  CreditCard,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import type { TransactionType } from '@/hooks/api/useWalletApi'

// Extended transaction types that include additional types from usePaymentsApi
export type ExtendedTransactionType = TransactionType | 'refund' | 'reserve' | 'release'

// Icon configuration type
export interface TransactionIconConfig {
  icon: LucideIcon
  colorClass: string
}

/**
 * Get the appropriate Lucide icon for a transaction type
 * @param type - The transaction type
 * @returns The Lucide icon component
 */
export function getTransactionIcon(type: ExtendedTransactionType | string): LucideIcon {
  switch (type) {
    case 'earning':
      return ArrowDownToLine
    case 'withdrawal':
      return ArrowUpFromLine
    case 'top_up':
      return Plus
    case 'payment':
      return CreditCard
    case 'refund':
      return RefreshCw
    case 'reserve':
    case 'release':
      return Wallet
    default:
      return Wallet
  }
}

/**
 * Get the color class for a transaction type
 * @param type - The transaction type
 * @returns Tailwind CSS color class string
 */
export function getTransactionColor(type: ExtendedTransactionType | string): string {
  switch (type) {
    case 'earning':
    case 'top_up':
    case 'refund':
    case 'release':
      return 'text-green-600'
    case 'withdrawal':
    case 'payment':
    case 'reserve':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

/**
 * Get both icon and color configuration for a transaction type
 * @param type - The transaction type
 * @returns Object containing icon component and color class
 */
export function getTransactionIconConfig(type: ExtendedTransactionType | string): TransactionIconConfig {
  return {
    icon: getTransactionIcon(type),
    colorClass: getTransactionColor(type),
  }
}

/**
 * Determine if a transaction type represents incoming funds
 * @param type - The transaction type
 * @returns True if the transaction adds funds to the wallet
 */
export function isPositiveTransaction(type: ExtendedTransactionType | string): boolean {
  return type === 'earning' || type === 'top_up' || type === 'refund' || type === 'release'
}

/**
 * Get the display amount for a transaction (positive or negative)
 * @param type - The transaction type
 * @param amount - The transaction amount (always positive)
 * @returns The amount with correct sign for display
 */
export function getTransactionDisplayAmount(type: ExtendedTransactionType | string, amount: number): number {
  return isPositiveTransaction(type) ? amount : -Math.abs(amount)
}

/**
 * Format transaction type for display (converts snake_case to Title Case)
 * @param type - The transaction type
 * @returns Human-readable transaction type string
 */
export function formatTransactionType(type: ExtendedTransactionType | string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
