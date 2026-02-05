import { Building, CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatReviewDate } from '@/lib/utils'
import { getPayoutStatusBadge } from '@/lib/badgeUtils'
import type { PayoutStatus } from '@/hooks/api/usePaymentsApi'

interface PayoutCardProps {
  id: number
  amount: number
  status: PayoutStatus
  method: string
  methodLastFour: string
  createdAt: string
  completedAt?: string
  failureReason?: string
  currency?: string
  onClick?: () => void
}

export function PayoutCard({
  amount,
  status,
  method,
  methodLastFour,
  createdAt,
  completedAt,
  failureReason,
  currency = 'EUR',
  onClick,
}: PayoutCardProps) {
  const badgeConfig = getPayoutStatusBadge(status)

  const getMethodIcon = () => {
    if (method === 'bank_account') {
      return <Building className="h-4 w-4" />
    }
    return <CreditCard className="h-4 w-4" />
  }

  return (
    <div
      className={`flex items-center justify-between p-4 border rounded-lg ${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-muted rounded-full">
          {getMethodIcon()}
        </div>
        <div>
          <p className="font-medium">
            {method === 'bank_account' ? 'Bank Transfer' : 'Card Transfer'}
          </p>
          <p className="text-sm text-muted-foreground">
            ****{methodLastFour} - {formatReviewDate(createdAt)}
          </p>
          {status === 'failed' && failureReason && (
            <p className="text-xs text-destructive mt-1">{failureReason}</p>
          )}
          {status === 'paid' && completedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Completed {formatReviewDate(completedAt)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-semibold">{formatCurrency(amount, currency)}</span>
        <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
      </div>
    </div>
  )
}

// List component for multiple payouts
interface PayoutListProps {
  payouts: PayoutCardProps[]
  emptyMessage?: string
}

export function PayoutList({ payouts, emptyMessage = 'No payouts yet' }: PayoutListProps) {
  if (payouts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {payouts.map((payout) => (
        <PayoutCard key={payout.id} {...payout} />
      ))}
    </div>
  )
}
