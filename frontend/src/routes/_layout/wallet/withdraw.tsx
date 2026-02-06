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
  ArrowUpFromLine,
  CreditCard,
  Loader2,
  Check,
  AlertCircle,
  Building,
} from 'lucide-react'
import { useWalletBalance, usePaymentMethods, useWithdraw } from '@/hooks/api/useWalletApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import type { PaymentMethodType } from '@/hooks/api/useWalletApi'

export const Route = createFileRoute('/_layout/wallet/withdraw')({
  component: WithdrawPage,
})

function WithdrawPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { isStaff } = useAuth()

  const { data: walletData, isLoading: isLoadingBalance } = useWalletBalance()
  const { data: paymentMethodsData, isLoading: isLoadingMethods } = usePaymentMethods()
  const withdraw = useWithdraw()

  const [amount, setAmount] = useState('')
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('')
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')
  const [error, setError] = useState('')

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

  const handleSubmit = () => {
    const numAmount = parseFloat(amount)

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (numAmount > balance) {
      setError('Insufficient balance')
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
      await withdraw.mutateAsync({
        amount: parseFloat(amount),
        payment_method_id: selectedMethod.id,
      })
      setStep('success')
    } catch {
      addToast({
        type: 'error',
        title: 'Withdrawal failed',
        description: 'There was an error processing your withdrawal. Please try again.',
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

  // Redirect if not staff
  if (!isStaff && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/wallet">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Withdraw</h1>
            <p className="text-muted-foreground">Withdraw funds from your wallet</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Not available"
              description="Withdrawals are only available for staff users."
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
            <h1 className="text-2xl font-bold">Withdraw</h1>
            <p className="text-muted-foreground">Withdraw funds from your wallet</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center py-8">
              <div className="p-4 bg-green-100 rounded-full mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Withdrawal Initiated!</h2>
              <p className="text-muted-foreground text-center mb-2">
                Your withdrawal of {formatCurrency(parseFloat(amount), currency)} has been initiated.
              </p>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Funds will be transferred to your {selectedMethod?.type === 'card' ? 'card' : 'bank account'} ending in ****{selectedMethod?.last_four} within 1-3 business days.
              </p>
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
            <h1 className="text-2xl font-bold">Confirm Withdrawal</h1>
            <p className="text-muted-foreground">Review and confirm your withdrawal</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Summary</CardTitle>
            <CardDescription>Please review the details below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-lg">{formatCurrency(parseFloat(amount), currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">To</span>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated arrival</span>
                <span className="font-medium">1-3 business days</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={withdraw.isPending} className="flex-1">
                {withdraw.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm Withdrawal
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
          <h1 className="text-2xl font-bold">Withdraw</h1>
          <p className="text-muted-foreground">Withdraw funds from your wallet</p>
        </div>
      </div>

      {/* Balance Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(balance, currency)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ArrowUpFromLine className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Form */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Details</CardTitle>
          <CardDescription>Enter the amount you want to withdraw</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentMethods.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payment methods"
              description="You need to add a payment method before you can withdraw funds."
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
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: {formatCurrency(balance, currency)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Withdraw To</Label>
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
                <ArrowUpFromLine className="h-4 w-4 mr-2" />
                Continue to Review
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
