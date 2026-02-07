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
    className: 'bg-warning/10 text-warning ring-warning/20',
  },
  released: {
    icon: LockOpen,
    label: 'Funds released',
    className: 'bg-success/10 text-success ring-success/20',
  },
  disputed: {
    icon: AlertTriangle,
    label: 'In dispute',
    className: 'bg-destructive/10 text-destructive ring-destructive/20',
  },
  none: {
    icon: Lock,
    label: 'No escrow',
    className: 'bg-muted text-muted-foreground ring-border',
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
