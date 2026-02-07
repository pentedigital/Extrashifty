import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Plus,
  History,
  Settings,
  RefreshCw,
  Clock,
  Check,
  Loader2,
  AlertTriangle,
  CreditCard,
  Calendar,
  Building,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getTransactionIcon, getTransactionColor, getTransactionDisplayAmount } from '@/lib/transactionUtils'
import { getTransactionStatusBadge } from '@/lib/badgeUtils'
import {
  useCompanyWalletBalance,
  useTransactionHistory,
  useAutoTopupConfig,
} from '@/hooks/api/usePaymentsApi'
import { BalanceDisplay, LowBalanceWarning } from '@/components/Payment'

export const Route = createFileRoute('/_layout/company/wallet/')({
  component: CompanyWalletPage,
})

function CompanyWalletPage() {
  // API hooks
  const { data: walletData, isLoading: isLoadingBalance, error: balanceError } = useCompanyWalletBalance()
  const { data: transactionsData, isLoading: isLoadingTransactions } = useTransactionHistory({ limit: 10 })
  const { data: autoTopupData } = useAutoTopupConfig()

  const currency = walletData?.currency ?? 'EUR'
  const transactions = transactionsData?.items ?? []
  const isLowBalance = walletData?.is_low_balance ?? false
  const lowBalanceThreshold = walletData?.low_balance_threshold ?? 100

  const formatTransactionDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-IE', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString))
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
          <h1 className="text-2xl font-bold">Company Wallet</h1>
          <p className="text-muted-foreground">Manage your funds and payments</p>
        </div>
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load wallet"
          description="There was an error loading your wallet. Please try again."
          action={
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Wallet</h1>
          <p className="text-muted-foreground">Manage your funds and payments</p>
        </div>
        <Link to="/wallet/top-up">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Top Up Wallet
          </Button>
        </Link>
      </div>

      {/* Low Balance Warning */}
      {isLowBalance && walletData && (
        <LowBalanceWarning
          balance={walletData.available}
          threshold={lowBalanceThreshold}
          currency={currency}
        />
      )}

      {/* Balance Display */}
      {walletData && (
        <BalanceDisplay
          available={walletData.available}
          reserved={walletData.reserved}
          total={walletData.total}
          currency={currency}
          lowBalanceThreshold={lowBalanceThreshold}
          showTopUpButton={false}
        />
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/wallet/top-up">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-full bg-success/10">
                <Plus className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium">Quick Top-up</p>
                <p className="text-sm text-muted-foreground">Add funds</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/wallet/transactions">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-full bg-info/10">
                <History className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="font-medium">Transactions</p>
                <p className="text-sm text-muted-foreground">View history</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/wallet/payment-methods">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-full bg-purple-100">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Payment Methods</p>
                <p className="text-sm text-muted-foreground">Manage cards</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/wallet/top-up">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-full bg-warning/10">
                <Settings className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium">Auto Top-up</p>
                <p className="text-sm text-muted-foreground">
                  {autoTopupData?.enabled ? 'Enabled' : 'Configure'}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Auto Top-up Status */}
      {autoTopupData?.enabled && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/10">
                  <RefreshCw className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="font-medium">Auto Top-up Enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Your wallet will automatically top up {formatCurrency(autoTopupData.amount, currency)} when
                    balance falls below {formatCurrency(autoTopupData.threshold, currency)}
                  </p>
                </div>
              </div>
              <Link to="/wallet/top-up">
                <Button variant="ghost" size="sm">
                  Configure
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Schedule Info (for agencies using company mode) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Payment Schedule</CardTitle>
          </div>
          <CardDescription>
            How funds are handled when you accept workers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-warning/10 mt-0.5">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="font-medium">Worker Accepted</p>
                <p className="text-sm text-muted-foreground">
                  When you accept a worker, the shift cost is allocated from your available balance
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-info/10 mt-0.5">
                <Check className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="font-medium">Shift Completed</p>
                <p className="text-sm text-muted-foreground">
                  After the worker clocks out and hours are verified, payment is processed
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-success/10 mt-0.5">
                <Building className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-medium">Worker Paid</p>
                <p className="text-sm text-muted-foreground">
                  Workers receive their earnings after verification (usually within 24-48 hours)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Your latest wallet activity</CardDescription>
          </div>
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
              icon={History}
              title="No transactions yet"
              description="Your transaction history will appear here after you top up or accept workers."
            />
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const displayAmount = getTransactionDisplayAmount(transaction.type, transaction.amount)
                const TransactionIcon = getTransactionIcon(transaction.type)
                const transactionColor = getTransactionColor(transaction.type)
                const statusBadge = getTransactionStatusBadge(transaction.status)
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-full">
                        <TransactionIcon className={`h-4 w-4 ${transactionColor}`} />
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
                          displayAmount >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {displayAmount >= 0 ? '+' : ''}
                        {formatCurrency(displayAmount, currency)}
                      </p>
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
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
