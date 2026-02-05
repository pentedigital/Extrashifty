import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

/**
 * Formats a date string to a human-readable format with year
 * Used for review dates and similar contexts
 */
export function formatReviewDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formats a date for payout displays
 * Shows weekday, month and day (e.g., "Monday, Feb 5")
 */
export function formatPayoutDate(date: string | null): string {
  if (!date) return 'No payout scheduled'
  const d = new Date(date)
  return d.toLocaleDateString('en-IE', { weekday: 'long', month: 'short', day: 'numeric' })
}

/**
 * Formats a date string into a relative time (e.g., "5 minutes ago")
 * Used for notifications and activity feeds
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  return date.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10))
  return new Intl.DateTimeFormat('en-IE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatDateRange(date: string, startTime: string, endTime: string): string {
  return `${formatDate(date)}, ${formatTime(startTime)} - ${formatTime(endTime)}`
}
