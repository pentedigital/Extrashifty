import { Link } from '@tanstack/react-router'
import { BaseModal } from '@/components/ui/base-modal'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Wallet, ArrowRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface InsufficientFundsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
  requiredAmount: number
  currency?: string
  shiftTitle?: string
  onTopUp?: () => void
}

/**
 * Modal displayed when company tries to accept a worker but has insufficient funds.
 * Shows clear breakdown of current balance vs required amount.
 */
export function InsufficientFundsModal({
  open,
  onOpenChange,
  currentBalance,
  requiredAmount,
  currency = 'EUR',
  shiftTitle,
  onTopUp,
}: InsufficientFundsModalProps) {
  const shortfall = requiredAmount - currentBalance

  const footer = (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="sm:flex-1"
      >
        Cancel
      </Button>

      {onTopUp ? (
        <Button onClick={onTopUp} className="sm:flex-1">
          <Wallet className="mr-2 h-4 w-4" />
          Top Up Now
        </Button>
      ) : (
        <Link to="/wallet/top-up" className="sm:flex-1">
          <Button className="w-full">
            <Wallet className="mr-2 h-4 w-4" />
            Top Up Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  )

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Insufficient Funds"
      description={`You don't have enough funds to accept this worker${shiftTitle ? ` for "${shiftTitle}"` : ''}.`}
      footer={footer}
    >
      <div className="text-center sm:text-left">
        <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
      </div>

      <div className="py-4">
        {/* Balance Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <span className="text-muted-foreground">Current Balance</span>
            <span className="font-semibold">{formatCurrency(currentBalance, currency)}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <span className="text-muted-foreground">Shift Cost</span>
            <span className="font-semibold">{formatCurrency(requiredAmount, currency)}</span>
          </div>

          <div className={cn(
            'flex items-center justify-between p-3 rounded-lg border-2',
            'bg-red-50 border-red-200'
          )}>
            <span className="text-red-700 font-medium">Shortfall</span>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(shortfall, currency)}
            </span>
          </div>
        </div>

        {/* Helpful message */}
        <p className="text-sm text-muted-foreground mt-4">
          Top up at least {formatCurrency(shortfall, currency)} to accept this worker.
          We recommend adding a buffer to cover future shifts.
        </p>
      </div>
    </BaseModal>
  )
}

/**
 * Inline insufficient funds warning for use in accept confirmation dialogs
 */
export function InsufficientFundsWarning({
  currentBalance,
  requiredAmount,
  currency = 'EUR',
  className,
}: {
  currentBalance: number
  requiredAmount: number
  currency?: string
  className?: string
}) {
  const shortfall = requiredAmount - currentBalance
  const hasSufficientFunds = currentBalance >= requiredAmount

  if (hasSufficientFunds) {
    return (
      <div className={cn(
        'p-3 rounded-lg bg-green-50 border border-green-200',
        className
      )}>
        <div className="flex items-center gap-2 text-green-700">
          <Wallet className="h-4 w-4" />
          <span className="font-medium">Sufficient funds available</span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          {formatCurrency(requiredAmount, currency)} will be used for this shift
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'p-3 rounded-lg bg-red-50 border border-red-200',
      className
    )}>
      <div className="flex items-center gap-2 text-red-700">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">Insufficient funds</span>
      </div>
      <p className="text-sm text-red-600 mt-1">
        You need {formatCurrency(shortfall, currency)} more to accept this worker
      </p>
      <div className="mt-2 text-xs text-red-600 space-y-0.5">
        <div className="flex justify-between">
          <span>Current balance:</span>
          <span className="font-medium">{formatCurrency(currentBalance, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shift cost:</span>
          <span className="font-medium">{formatCurrency(requiredAmount, currency)}</span>
        </div>
      </div>
    </div>
  )
}
