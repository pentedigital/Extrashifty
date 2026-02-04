import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
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
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Check,
  X,
  History,
  CreditCard,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { mockApi } from '@/lib/mockApi'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types/features'

export const Route = createFileRoute('/_layout/wallet')({
  component: WalletPage,
})

function WalletPage() {
  const [balance, setBalance] = useState<number>(0)
  const [pending, setPending] = useState<number>(0)
  const [currency, setCurrency] = useState<string>('EUR')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)
  const { addToast } = useToast()

  const handleViewHistory = () => {
    addToast({
      type: 'info',
      title: 'Transaction history',
      description: 'Full transaction history will be available soon.',
    })
  }

  useEffect(() => {
    async function fetchWalletData() {
      setIsLoading(true)
      try {
        const [balanceData, transactionsData] = await Promise.all([
          mockApi.wallet.getBalance(),
          mockApi.wallet.getTransactions(),
        ])
        setBalance(balanceData.balance)
        setPending(balanceData.pending)
        setCurrency(balanceData.currency)
        setTransactions(transactionsData)
      } catch {
        // Error handled silently
      } finally {
        setIsLoading(false)
      }
    }
    fetchWalletData()
  }, [])

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

    setIsWithdrawing(true)
    setWithdrawError('')
    try {
      await mockApi.wallet.withdraw(amount)
      setWithdrawSuccess(true)
      setBalance((prev) => prev - amount)
      setTimeout(() => {
        setIsWithdrawOpen(false)
        setWithdrawSuccess(false)
        setWithdrawAmount('')
      }, 2000)
    } catch {
      setWithdrawError('Withdrawal failed. Please try again.')
    } finally {
      setIsWithdrawing(false)
    }
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'payment':
        return <ArrowDownToLine className="h-4 w-4 text-green-600" />
      case 'withdrawal':
        return <ArrowUpFromLine className="h-4 w-4 text-red-600" />
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-blue-600" />
      case 'deposit':
        return <CreditCard className="h-4 w-4 text-green-600" />
      default:
        return <Wallet className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: Transaction['status']) => {
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
      case 'processing':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            Failed
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="outline" className="gap-1">
            <X className="h-3 w-3" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
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
      <h1 className="text-2xl font-bold">Wallet</h1>

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
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(balance, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Earnings</p>
              <p className="text-2xl font-semibold text-yellow-600">
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
            <p className="text-muted-foreground text-center py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.slice(0, 5).map((transaction) => (
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
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p
                      className={`font-semibold ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.amount >= 0 ? '+' : ''}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    {getStatusBadge(transaction.status)}
                  </div>
                </div>
              ))}
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
              <div className="p-3 bg-green-100 rounded-full mb-4">
                <Check className="h-8 w-8 text-green-600" />
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
                    <p className="text-sm text-red-600">{withdrawError}</p>
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
                <Button onClick={handleWithdraw} disabled={isWithdrawing}>
                  {isWithdrawing ? (
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
