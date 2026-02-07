import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Wallet,
  ArrowUpFromLine,
  Check,
  History,
  Loader2,
  Receipt,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { useWalletBalance, useWalletTransactions, useWithdraw } from '@/hooks/api/useWalletApi'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getTransactionIcon, getTransactionColor } from '@/lib/transactionUtils'
import { getTransactionStatusBadge } from '@/lib/badgeUtils'

export const Route = createFileRoute('/_layout/wallet')({
  component: WalletPage,
})

function WalletPage() {
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()

  // Use real API hooks
  const { data: balanceData, isLoading: isBalanceLoading } = useWalletBalance()
  const { data: transactionsData, isLoading: isTransactionsLoading } = useWalletTransactions({ limit: 10 })
  const withdrawMutation = useWithdraw()

  const balance = balanceData?.balance ?? 0
  const pending = 0 // Pending calculated from transactions if needed
  const currency = balanceData?.currency ?? 'EUR'
  const transactions = transactionsData ?? []
  const isLoading = isBalanceLoading || isTransactionsLoading

  const handleViewHistory = () => {
    navigate({ to: '/wallet/history' })
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Please enter a valid amount')
      return
    }
    if (amount > balance) {
      setWithdrawError('Insufficient balance')
      return
    }

    setWithdrawError('')
    withdrawMutation.mutate(
      { amount, payment_method_id: 1 }, // Default payment method
      {
        onSuccess: () => {
          setWithdrawSuccess(true)
          addToast({
            title: 'Withdrawal initiated',
            description: 'Your funds will arrive in 1-2 business days.',
            variant: 'success',
          })
          setTimeout(() => {
            setIsWithdrawOpen(false)
            setWithdrawSuccess(false)
            setWithdrawAmount('')
          }, 2000)
        },
        onError: () => {
          setWithdrawError('Withdrawal failed. Please try again.')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Manage your earnings and withdrawals</p>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold text-success">
                {formatCurrency(balance, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Earnings</p>
              <p className="text-2xl font-semibold text-warning">
                {formatCurrency(pending, currency)}
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
      <div className="flex gap-4">
        <Button onClick={() => setIsWithdrawOpen(true)} className="gap-2">
          <ArrowUpFromLine className="h-4 w-4" />
          Withdraw
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleViewHistory}>
          <History className="h-4 w-4" />
          View History
        </Button>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Your transaction history will appear here once you start earning or making withdrawals."
            />
          ) : (
            <div className="space-y-4">
              {transactions.slice(0, 5).map((transaction) => {
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
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p
                        className={`font-semibold ${
                          transaction.amount >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {transaction.amount >= 0 ? '+' : ''}
                        {formatCurrency(transaction.amount, transaction.currency)}
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

      {/* Withdraw Dialog */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Transfer funds from your wallet to your bank account.
            </DialogDescription>
          </DialogHeader>

          {withdrawSuccess ? (
            <div className="flex flex-col items-center py-8">
              <div className="p-3 bg-success/10 rounded-full mb-4">
                <Check className="h-8 w-8 text-success" />
              </div>
              <p className="text-lg font-semibold">Withdrawal Initiated!</p>
              <p className="text-muted-foreground">
                Your funds will arrive in 1-2 business days.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({currency})</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => {
                      setWithdrawAmount(e.target.value)
                      setWithdrawError('')
                    }}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {formatCurrency(balance, currency)}
                  </p>
                  {withdrawError && (
                    <p className="text-sm text-destructive">{withdrawError}</p>
                  )}
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Funds will be transferred to your linked bank account ending in
                    ****4567.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsWithdrawOpen(false)
                    setWithdrawAmount('')
                    setWithdrawError('')
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleWithdraw} disabled={withdrawMutation.isPending}>
                  {withdrawMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Withdraw'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
