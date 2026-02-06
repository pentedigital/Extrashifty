import { Lock, LockOpen, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type EscrowStatus = 'locked' | 'released' | 'disputed' | 'none'

interface EscrowStatusBadgeProps {
  status: EscrowStatus
  className?: string
  showLabel?: boolean
}

const statusConfig = {
  locked: {
    icon: Lock,
    label: 'Funds secured',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/20',
  },
  released: {
    icon: LockOpen,
    label: 'Funds released',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/20',
  },
  disputed: {
    icon: AlertTriangle,
    label: 'In dispute',
    className: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/20',
  },
  none: {
    icon: Lock,
    label: 'No escrow',
    className: 'bg-zinc-50 text-zinc-500 ring-zinc-600/10 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-500/20',
  },
}

export function EscrowStatusBadge({ status, className, showLabel = true }: EscrowStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        config.className,
        className
      )}
    >
      <Icon className="mr-1 h-3 w-3" />
      {showLabel && config.label}
    </span>
  )
}

export type { EscrowStatus }
