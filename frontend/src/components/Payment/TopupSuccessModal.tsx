import { Link } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Wallet, Receipt, ArrowRight } from 'lucide-react'

interface TopupSuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  newBalance: number
  currency?: string
  onContinue?: () => void
  showViewTransactions?: boolean
}

/**
 * Success modal displayed after a successful top-up.
 * Shows the topped up amount and new balance.
 */
export function TopupSuccessModal({
  open,
  onOpenChange,
  amount,
  newBalance,
  currency = 'EUR',
  onContinue,
  showViewTransactions = true,
}: TopupSuccessModalProps) {
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
    }).format(amt)
  }

  const handleContinue = () => {
    onOpenChange(false)
    onContinue?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          {/* Success Animation */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 animate-in zoom-in duration-300">
              <Check className="h-6 w-6 text-white" />
            </div>
          </div>

          <DialogTitle className="text-xl">Top-Up Successful!</DialogTitle>
          <DialogDescription>
            Your wallet has been topped up successfully
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Amount Added */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-1">Amount Added</p>
            <p className="text-3xl font-bold text-green-600">
              +{formatCurrency(amount)}
            </p>
          </div>

          {/* New Balance */}
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">New Balance</span>
              </div>
              <span className="text-xl font-bold text-brand-600">
                {formatCurrency(newBalance)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {showViewTransactions && (
            <Link to="/wallet/transactions" className="sm:flex-1">
              <Button variant="outline" className="w-full">
                <Receipt className="mr-2 h-4 w-4" />
                View Transactions
              </Button>
            </Link>
          )}

          <Button onClick={handleContinue} className="sm:flex-1">
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Inline success message for use within forms
 */
export function TopupSuccessMessage({
  amount,
  newBalance,
  currency = 'EUR',
  onDismiss,
}: {
  amount: number
  newBalance: number
  currency?: string
  onDismiss?: () => void
}) {
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
    }).format(amt)
  }

  return (
    <div className="p-6 rounded-lg border border-green-200 bg-green-50">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 mb-4">
          <Check className="h-6 w-6 text-white" />
        </div>

        <h3 className="text-lg font-semibold text-green-900 mb-1">
          Top-Up Successful!
        </h3>
        <p className="text-sm text-green-700 mb-4">
          {formatCurrency(amount)} has been added to your wallet
        </p>

        <div className="w-full p-3 rounded-lg bg-white border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">New Balance</span>
            <span className="font-bold text-green-600">
              {formatCurrency(newBalance)}
            </span>
          </div>
        </div>

        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="mt-4 text-green-700 hover:text-green-800 hover:bg-green-100"
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Worker accepted confirmation for shift acceptance
 */
export function FundsReservedConfirmation({
  amount,
  shiftTitle,
  workerName,
  currency = 'EUR',
  onClose,
}: {
  amount: number
  shiftTitle: string
  workerName: string
  currency?: string
  onClose?: () => void
}) {
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
    }).format(amt)
  }

  return (
    <div className="p-6 rounded-lg border border-green-200 bg-green-50">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 mb-4">
          <Check className="h-6 w-6 text-white" />
        </div>

        <h3 className="text-lg font-semibold text-green-900 mb-1">
          Worker Accepted!
        </h3>
        <p className="text-sm text-green-700 mb-4">
          <strong>{workerName}</strong> has been assigned to "{shiftTitle}"
        </p>

        <div className="w-full p-3 rounded-lg bg-white border border-green-200 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Shift Cost</span>
            <span className="font-bold text-amber-600">
              {formatCurrency(amount)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Payment will be processed after the shift is completed and hours are verified.
          </p>
        </div>

        {onClose && (
          <Button onClick={onClose} className="mt-4">
            Done
          </Button>
        )}
      </div>
    </div>
  )
}
