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
