import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowLeft,
  Plus,
  CreditCard,
  Loader2,
  Check,
  AlertCircle,
  Building,
  Wallet,
} from 'lucide-react'
import { useWalletBalance, usePaymentMethods, useTopUp } from '@/hooks/api/useWalletApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import type { PaymentMethodType } from '@/hooks/api/useWalletApi'

export const Route = createFileRoute('/_layout/wallet/top-up')({
  component: TopUpPage,
})

const quickAmounts = [50, 100, 250, 500, 1000]

function TopUpPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { isCompany } = useAuth()

  const { data: walletData, isLoading: isLoadingBalance } = useWalletBalance()
  const { data: paymentMethodsData, isLoading: isLoadingMethods } = usePaymentMethods()
  const topUp = useTopUp()

  const [amount, setAmount] = useState('')
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('')
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')
  const [error, setError] = useState('')
  const [newBalance, setNewBalance] = useState<number | null>(null)

  const balance = walletData?.balance ?? 0
  const currency = walletData?.currency ?? 'EUR'
  const paymentMethods = paymentMethodsData?.items ?? []

  const isLoading = isLoadingBalance || isLoadingMethods

  // Find default payment method
  const defaultMethod = paymentMethods.find((m) => m.is_default)
  const selectedMethod = paymentMethods.find(
    (m) => m.id === (selectedPaymentMethodId ? parseInt(selectedPaymentMethodId) : defaultMethod?.id)
  )

  const paymentMethodOptions = paymentMethods.map((m) => ({
    value: String(m.id),
    label: `${m.type === 'card' ? m.brand || 'Card' : 'Bank'} ****${m.last_four}${m.is_default ? ' (Default)' : ''}`,
  }))

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(String(quickAmount))
    setError('')
  }

  const handleSubmit = () => {
    const numAmount = parseFloat(amount)

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (numAmount < 10) {
      setError('Minimum top-up amount is 10.00')
      return
    }

    if (!selectedMethod) {
      setError('Please select a payment method')
      return
    }

    setError('')
    setStep('confirm')
  }

  const handleConfirm = async () => {
    if (!selectedMethod) return

    try {
      const result = await topUp.mutateAsync({
        amount: parseFloat(amount),
        payment_method_id: selectedMethod.id,
      })
      setNewBalance(result.new_balance)
      setStep('success')
    } catch {
      addToast({
        type: 'error',
        title: 'Top-up failed',
        description: 'There was an error processing your top-up. Please try again.',
      })
    }
  }

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('form')
    }
  }

  const getPaymentMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case 'card':
        return <CreditCard className="h-5 w-5" />
      case 'bank_account':
        return <Building className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  // Redirect if not company
  if (!isCompany && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/wallet">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Top Up</h1>
            <p className="text-muted-foreground">Add funds to your wallet</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Not available"
              description="Top-ups are only available for company users."
              action={
                <Link to="/wallet">
                  <Button>Back to Wallet</Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/wallet">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Top Up</h1>
            <p className="text-muted-foreground">Add funds to your wallet</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center py-8">
              <div className="p-4 bg-green-100 rounded-full mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Top-Up Successful!</h2>
              <p className="text-muted-foreground text-center mb-2">
                {formatCurrency(parseFloat(amount), currency)} has been added to your wallet.
              </p>
              {newBalance !== null && (
                <p className="text-lg font-semibold text-green-600 mb-6">
                  New balance: {formatCurrency(newBalance, currency)}
                </p>
              )}
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate({ to: '/wallet' })}>
                  Back to Wallet
                </Button>
                <Link to="/wallet/transactions">
                  <Button>View Transactions</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Confirmation state
  if (step === 'confirm') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Confirm Top-Up</h1>
            <p className="text-muted-foreground">Review and confirm your top-up</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Top-Up Summary</CardTitle>
            <CardDescription>Please review the details below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount to add</span>
                <span className="font-semibold text-lg">{formatCurrency(parseFloat(amount), currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">From</span>
                <div className="flex items-center gap-2">
                  {selectedMethod && getPaymentMethodIcon(selectedMethod.type)}
                  <span className="font-medium">
                    {selectedMethod?.type === 'card'
                      ? `${selectedMethod.brand || 'Card'} ****${selectedMethod.last_four}`
                      : `Bank ****${selectedMethod?.last_four}`
                    }
                  </span>
                </div>
              </div>
              <div className="border-t pt-4 flex justify-between">
                <span className="text-muted-foreground">Current balance</span>
                <span className="font-medium">{formatCurrency(balance, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New balance after top-up</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(balance + parseFloat(amount), currency)}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={topUp.isPending} className="flex-1">
                {topUp.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm Top-Up
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Form state
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/wallet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Top Up</h1>
          <p className="text-muted-foreground">Add funds to your wallet</p>
        </div>
      </div>

      {/* Balance Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(balance, currency)}
              </p>
            </div>
            <div className="p-3 bg-brand-100 rounded-full">
              <Wallet className="h-6 w-6 text-brand-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top-Up Form */}
      <Card>
        <CardHeader>
          <CardTitle>Top-Up Details</CardTitle>
          <CardDescription>Enter the amount you want to add to your wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentMethods.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payment methods"
              description="You need to add a payment method before you can top up your wallet."
              action={
                <Link to="/wallet/payment-methods">
                  <Button>Add Payment Method</Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({currency})</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setError('')
                  }}
                  min="10"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: {formatCurrency(10, currency)}
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="space-y-2">
                <Label>Quick Amounts</Label>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      type="button"
                      variant={amount === String(quickAmount) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleQuickAmount(quickAmount)}
                    >
                      {formatCurrency(quickAmount, currency)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Pay From</Label>
                <Select
                  id="paymentMethod"
                  value={selectedPaymentMethodId || (defaultMethod ? String(defaultMethod.id) : '')}
                  onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                  options={paymentMethodOptions}
                  placeholder="Select payment method"
                />
                <Link to="/wallet/payment-methods" className="text-xs text-brand-600 hover:underline">
                  Manage payment methods
                </Link>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button onClick={handleSubmit} className="w-full" disabled={!amount || !selectedMethod}>
                <Plus className="h-4 w-4 mr-2" />
                Continue to Review
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
