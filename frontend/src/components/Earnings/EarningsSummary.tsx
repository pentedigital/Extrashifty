import { DollarSign, Clock, Calendar, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatPayoutDate } from '@/lib/utils'

interface EarningsSummaryProps {
  thisWeek: number
  thisMonth: number
  allTime: number
  availableBalance: number
  pendingEarnings: number
  nextPayoutDate: string | null
  nextPayoutAmount: number
  isLoading?: boolean
  currency?: string
}

export function EarningsSummary({
  thisWeek,
  thisMonth,
  allTime,
  availableBalance,
  pendingEarnings,
  nextPayoutDate,
  nextPayoutAmount,
  isLoading = false,
  currency = 'EUR',
}: EarningsSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="This Week"
        value={formatCurrency(thisWeek, currency)}
        icon={Calendar}
      />
      <StatCard
        title="This Month"
        value={formatCurrency(thisMonth, currency)}
        icon={TrendingUp}
      />
      <StatCard
        title="Available Balance"
        value={formatCurrency(availableBalance, currency)}
        subtitle={pendingEarnings > 0 ? `${formatCurrency(pendingEarnings, currency)} pending` : undefined}
        icon={DollarSign}
      />
      <StatCard
        title="Next Payout"
        value={formatCurrency(nextPayoutAmount, currency)}
        subtitle={formatPayoutDate(nextPayoutDate)}
        icon={Clock}
      />
    </div>
  )
}

// Variant for agency earnings overview
interface AgencyEarningsSummaryProps {
  availableBalance: number
  pendingBalance: number
  reservedBalance: number
  mode: 'staff_provider' | 'full_intermediary'
  isLoading?: boolean
  currency?: string
}

export function AgencyEarningsSummary({
  availableBalance,
  pendingBalance,
  reservedBalance,
  mode,
  isLoading = false,
  currency = 'EUR',
}: AgencyEarningsSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
      </div>
    )
  }

  const modeLabel = mode === 'staff_provider' ? 'Staff Provider' : 'Full Intermediary'

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Available"
        value={formatCurrency(availableBalance, currency)}
        subtitle="Ready to withdraw"
        icon={DollarSign}
      />
      <StatCard
        title="Pending"
        value={formatCurrency(pendingBalance, currency)}
        subtitle="Processing"
        icon={Clock}
      />
      <StatCard
        title="Committed"
        value={formatCurrency(reservedBalance, currency)}
        subtitle={`Mode: ${modeLabel}`}
        icon={TrendingUp}
      />
    </div>
  )
}
