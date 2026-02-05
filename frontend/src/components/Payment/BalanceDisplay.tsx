import { Wallet, AlertTriangle, TrendingUp, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'

interface BalanceDisplayProps {
  available: number
  reserved: number
  total: number
  currency?: string
  lowBalanceThreshold?: number
  isLoading?: boolean
  showTopUpButton?: boolean
  compact?: boolean
  className?: string
}

/**
 * Reusable balance display component showing available, reserved, and total amounts.
 * Used in company wallet and dashboard pages.
 */
export function BalanceDisplay({
  available,
  reserved,
  total,
  currency = 'EUR',
  lowBalanceThreshold = 100,
  isLoading = false,
  showTopUpButton = true,
  compact = false,
  className,
}: BalanceDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const isLowBalance = available < lowBalanceThreshold

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-40 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <div>
            <span className="text-sm text-muted-foreground">Balance</span>
            <p className={cn(
              'text-lg font-bold',
              isLowBalance ? 'text-red-600' : 'text-green-600'
            )}>
              {formatCurrency(available)}
            </p>
          </div>
        </div>
        {showTopUpButton && (
          <Link to="/wallet/top-up">
            <Button size="sm" variant={isLowBalance ? 'default' : 'outline'}>
              Top Up
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Balance
          </CardTitle>
          {isLowBalance && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Low Balance
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Available Balance - Highlighted */}
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Available
            </p>
            <p className={cn(
              'text-3xl font-bold',
              isLowBalance ? 'text-red-600' : 'text-green-600'
            )}>
              {formatCurrency(available)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Funds ready to use
            </p>
          </div>

          {/* Pending and Total */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Pending
              </p>
              <p className="text-xl font-semibold text-amber-600">
                {formatCurrency(reserved)}
              </p>
            </div>
            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-lg font-medium">
                {formatCurrency(total)}
              </p>
            </div>
          </div>
        </div>

        {showTopUpButton && (
          <div className="mt-6 pt-4 border-t">
            <Link to="/wallet/top-up">
              <Button className="w-full sm:w-auto" variant={isLowBalance ? 'default' : 'outline'}>
                <Wallet className="mr-2 h-4 w-4" />
                Top Up Wallet
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Low balance warning banner to display at the top of pages
 */
export function LowBalanceWarning({
  balance,
  threshold,
  currency = 'EUR',
  className,
}: {
  balance: number
  threshold: number
  currency?: string
  className?: string
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const shortfall = threshold - balance

  return (
    <div className={cn(
      'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-amber-50 border border-amber-200',
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900">Low Balance Warning</p>
          <p className="text-sm text-amber-800">
            Your balance ({formatCurrency(balance)}) is below the recommended threshold
            of {formatCurrency(threshold)}. Top up {formatCurrency(shortfall)} or more
            to continue accepting workers smoothly.
          </p>
        </div>
      </div>
      <Link to="/wallet/top-up">
        <Button size="sm" className="shrink-0">
          Top Up Now
        </Button>
      </Link>
    </div>
  )
}

/**
 * Mini balance indicator for headers/sidebars
 */
export function BalanceIndicator({
  balance,
  currency = 'EUR',
  isLow = false,
}: {
  balance: number
  currency?: string
  isLow?: boolean
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  return (
    <Link to="/company/wallet">
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        isLow
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'bg-green-100 text-green-700 hover:bg-green-200'
      )}>
        <Wallet className="h-4 w-4" />
        {formatCurrency(balance)}
        {isLow && <AlertTriangle className="h-3 w-3" />}
      </div>
    </Link>
  )
}
