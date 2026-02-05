import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Check,
  X,
  History,
  CreditCard,
  RefreshCw,
  Loader2,
  Receipt,
  Plus,
} from 'lucide-react'
import { useWalletBalance, useWalletTransactions } from '@/hooks/api/useWalletApi'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import type { TransactionType, TransactionStatus } from '@/hooks/api/useWalletApi'

export const Route = createFileRoute('/_layout/wallet/')({
  component: WalletIndexPage,
})

function WalletIndexPage() {
  const { isStaff, isCompany } = useAuth()
  const { data: walletData, isLoading: isLoadingBalance, error: balanceError } = useWalletBalance()
  const { data: transactionsData, isLoading: isLoadingTransactions } = useWalletTransactions({ limit: 5 })

  const balance = walletData?.balance ?? 0
  const currency = walletData?.currency ?? 'EUR'
  const transactions = transactionsData?.items ?? []

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'earning':
        return <ArrowDownToLine className="h-4 w-4 text-green-600" />
      case 'withdrawal':
        return <ArrowUpFromLine className="h-4 w-4 text-red-600" />
      case 'top_up':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'payment':
        return <CreditCard className="h-4 w-4 text-red-600" />
      default:
        return <Wallet className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" />
            Completed
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatTransactionDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-IE', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString))
  }

  const getTransactionAmount = (type: TransactionType, amount: number) => {
    // Earnings and top-ups are positive, withdrawals and payments are negative
    const isPositive = type === 'earning' || type === 'top_up'
    return isPositive ? amount : -Math.abs(amount)
  }

  if (isLoadingBalance) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (balanceError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Manage your balance and transactions</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Wallet}
              title="Unable to load wallet"
              description="There was an error loading your wallet. Please try again later."
              action={
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">
          {isStaff ? 'Manage your earnings and withdrawals' : 'Manage your balance and payments'}
        </p>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Your Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(balance, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="text-2xl font-semibold">{currency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        {isStaff && (
          <Link to="/wallet/withdraw">
            <Button className="gap-2">
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </Button>
          </Link>
        )}
        {isCompany && (
          <Link to="/wallet/top-up">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Top Up
            </Button>
          </Link>
        )}
        <Link to="/wallet/transactions">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" />
            View All Transactions
          </Button>
        </Link>
        <Link to="/wallet/payment-methods">
          <Button variant="outline" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Methods
          </Button>
        </Link>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <Link to="/wallet/transactions">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Your transaction history will appear here once you start using your wallet."
            />
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const displayAmount = getTransactionAmount(transaction.type, transaction.amount)
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-full">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {transaction.type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.description || 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTransactionDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p
                        className={`font-semibold ${
                          displayAmount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {displayAmount >= 0 ? '+' : ''}
                        {formatCurrency(displayAmount, currency)}
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
