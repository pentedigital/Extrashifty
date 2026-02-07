import { useState, useCallback } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Check,
  AlertCircle,
  Building,
  Wallet,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import {
  useCompanyWalletBalance,
  useTopupWallet,
  useCreatePaymentIntent,
  useAutoTopupConfig,
  useConfigureAutoTopup,
} from '@/hooks/api/usePaymentsApi'
import { usePaymentMethods } from '@/hooks/api/useWalletApi'
import {
  StripeProvider,
  useStripeAvailable,
  CardPaymentForm,
  BankTransferInfo,
  BankTransferOption,
  TopupSuccessMessage,
} from '@/components/Payment'

export const Route = createFileRoute('/_layout/wallet/top-up')({
  component: TopUpPage,
})

// Quick amount buttons
const quickAmounts = [100, 500, 1000]

type PaymentMethod = 'card' | 'bank_transfer' | 'ach'
type Step = 'amount' | 'payment' | 'processing' | 'success'

function TopUpPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { isCompany } = useAuth()
  const stripeAvailable = useStripeAvailable()

  // API hooks
  const { data: walletData, isLoading: isLoadingBalance } = useCompanyWalletBalance()
  const { data: paymentMethodsData, isLoading: isLoadingMethods } = usePaymentMethods()
  const { data: autoTopupData, isLoading: isLoadingAutoTopup } = useAutoTopupConfig()
  const createPaymentIntent = useCreatePaymentIntent()
  const topupWallet = useTopupWallet()
  const configureAutoTopup = useConfigureAutoTopup()

  // Local state
  const [amount, setAmount] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [step, setStep] = useState<Step>('amount')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [newBalance, setNewBalance] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [showAutoTopup, setShowAutoTopup] = useState(false)

  // Auto-topup local edit state (null = use API value, non-null = user has edited)
  const [autoTopupEnabledOverride, setAutoTopupEnabledOverride] = useState<boolean | null>(null)
  const [autoTopupThresholdOverride, setAutoTopupThresholdOverride] = useState<string | null>(null)
  const [autoTopupAmountOverride, setAutoTopupAmountOverride] = useState<string | null>(null)

  // Derive effective values: user edits take priority over API data
  const autoTopupEnabled = autoTopupEnabledOverride ?? autoTopupData?.enabled ?? false
  const autoTopupThreshold = autoTopupThresholdOverride ?? String(autoTopupData?.threshold ?? 100)
  const autoTopupAmount = autoTopupAmountOverride ?? String(autoTopupData?.amount ?? 500)

  // Setters that mark user has edited
  const setAutoTopupEnabled = (v: boolean) => setAutoTopupEnabledOverride(v)
  const setAutoTopupThreshold = (v: string) => setAutoTopupThresholdOverride(v)
  const setAutoTopupAmount = (v: string) => setAutoTopupAmountOverride(v)

  const balance = walletData?.available ?? 0
  const currency = walletData?.currency ?? 'EUR'
  const paymentMethods = paymentMethodsData?.items ?? []
  const isLoading = isLoadingBalance || isLoadingMethods

  // Calculate the final amount
  const finalAmount = customAmount ? parseFloat(customAmount) : parseFloat(amount) || 0

  // Generate bank transfer reference (stable across renders)
  const [bankReference] = useState(() => `TOPUP-${Date.now().toString(36).toUpperCase()}`)

  // Handle quick amount selection
  const handleQuickAmount = (quickAmount: number) => {
    setAmount(String(quickAmount))
    setCustomAmount('')
    setError('')
  }

  // Handle custom amount
  const handleCustomAmount = (value: string) => {
    setCustomAmount(value)
    setAmount('')
    setError('')
  }

  // Validate and proceed to payment
  const handleContinueToPayment = async () => {
    if (finalAmount < 10) {
      setError('Minimum top-up amount is 10.00')
      return
    }

    if (finalAmount > 10000) {
      setError('Maximum top-up amount is 10,000.00')
      return
    }

    setError('')

    // For card payments with Stripe, create a payment intent
    if (paymentMethod === 'card' && stripeAvailable) {
      try {
        const intent = await createPaymentIntent.mutateAsync(finalAmount)
        setClientSecret(intent.client_secret)
        setStep('payment')
      } catch {
        setError('Failed to initialize payment. Please try again.')
      }
    } else {
      setStep('payment')
    }
  }

  // Handle successful card payment
  const handlePaymentSuccess = useCallback(async () => {
    setStep('processing')
    try {
      const result = await topupWallet.mutateAsync({
        amount: finalAmount,
        payment_intent_id: clientSecret?.split('_secret_')[0],
      })
      setNewBalance(result.new_balance)
      setStep('success')
    } catch {
      addToast({
        type: 'error',
        title: 'Top-up failed',
        description: 'There was an error processing your top-up. Please try again.',
      })
      setStep('amount')
    }
  }, [finalAmount, clientSecret, topupWallet, addToast])

  // Handle payment error
  const handlePaymentError = useCallback((errorMessage: string) => {
    addToast({
      type: 'error',
      title: 'Payment failed',
      description: errorMessage,
    })
  }, [addToast])

  // Handle legacy payment method top-up
  const handleLegacyTopup = async (paymentMethodId: number) => {
    setStep('processing')
    try {
      const result = await topupWallet.mutateAsync({
        amount: finalAmount,
        payment_method_id: paymentMethodId,
      })
      setNewBalance(result.new_balance)
      setStep('success')
    } catch {
      addToast({
        type: 'error',
        title: 'Top-up failed',
        description: 'There was an error processing your top-up. Please try again.',
      })
      setStep('amount')
    }
  }

  // Handle auto-topup save
  const handleSaveAutoTopup = async () => {
    try {
      await configureAutoTopup.mutateAsync({
        enabled: autoTopupEnabled,
        threshold: parseFloat(autoTopupThreshold),
        amount: parseFloat(autoTopupAmount),
      })
      addToast({
        type: 'success',
        title: 'Auto top-up saved',
        description: autoTopupEnabled
          ? `Your wallet will be topped up automatically when balance falls below ${formatCurrency(parseFloat(autoTopupThreshold), currency)}`
          : 'Auto top-up has been disabled',
      })
      setShowAutoTopup(false)
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to save',
        description: 'Could not save auto top-up settings. Please try again.',
      })
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

  if (isLoading || isLoadingAutoTopup) {
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
            <TopupSuccessMessage
              amount={finalAmount}
              newBalance={newBalance ?? balance + finalAmount}
              currency={currency}
              onDismiss={() => navigate({ to: '/wallet' })}
            />
            <div className="flex justify-center gap-4 mt-6">
              <Button variant="outline" onClick={() => navigate({ to: '/wallet' })}>
                Back to Wallet
              </Button>
              <Link to="/wallet/transactions">
                <Button>View Transactions</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Processing Top-Up</h1>
            <p className="text-muted-foreground">Please wait while we process your payment</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-brand-600 mb-4" />
              <p className="text-lg font-medium">Processing your payment...</p>
              <p className="text-muted-foreground">This may take a moment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Payment step
  if (step === 'payment') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep('amount')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Complete Payment</h1>
            <p className="text-muted-foreground">
              Adding {formatCurrency(finalAmount, currency)} to your wallet
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethod === 'card' && stripeAvailable && clientSecret ? (
              <StripeProvider clientSecret={clientSecret}>
                <CardPaymentForm
                  amount={finalAmount}
                  currency={currency}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  submitLabel="Top Up"
                />
              </StripeProvider>
            ) : paymentMethod === 'card' && paymentMethods.length > 0 ? (
              // Fallback to saved payment methods
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a saved payment method:
                </p>
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handleLegacyTopup(method.id)}
                    className="w-full p-4 rounded-lg border hover:border-brand-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {method.brand || 'Card'} ****{method.last_four}
                        </p>
                        {method.is_default && (
                          <p className="text-xs text-muted-foreground">Default</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : paymentMethod === 'bank_transfer' ? (
              <BankTransferInfo
                amount={finalAmount}
                currency={currency}
                reference={bankReference}
                onComplete={() => navigate({ to: '/wallet' })}
              />
            ) : paymentMethod === 'ach' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="font-medium text-blue-900">ACH Direct Debit</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Connect your US bank account for direct debit payments.
                    Funds typically arrive within 3-5 business days.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    ACH integration coming soon. For now, please use card payment
                    or bank transfer.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setStep('amount')} className="w-full">
                  Choose Different Method
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No payment method available"
                description="Please add a payment method to continue."
                action={
                  <Link to="/wallet/payment-methods">
                    <Button>Add Payment Method</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Amount selection step (default)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/wallet">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Top Up Wallet</h1>
            <p className="text-muted-foreground">Add funds to your wallet</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAutoTopup(!showAutoTopup)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Auto Top-up
        </Button>
      </div>

      {/* Current Balance */}
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

      {/* Auto Top-up Configuration */}
      {showAutoTopup && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Auto Top-up
                </CardTitle>
                <CardDescription>
                  Automatically top up your wallet when balance is low
                </CardDescription>
              </div>
              <Switch
                checked={autoTopupEnabled}
                onCheckedChange={setAutoTopupEnabled}
              />
            </div>
          </CardHeader>
          {autoTopupEnabled && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="threshold">When balance falls below</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currency}
                    </span>
                    <Input
                      id="threshold"
                      type="number"
                      value={autoTopupThreshold}
                      onChange={(e) => setAutoTopupThreshold(e.target.value)}
                      className="pl-12"
                      min="10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autoAmount">Top up amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currency}
                    </span>
                    <Input
                      id="autoAmount"
                      type="number"
                      value={autoTopupAmount}
                      onChange={(e) => setAutoTopupAmount(e.target.value)}
                      className="pl-12"
                      min="10"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSaveAutoTopup}
                disabled={configureAutoTopup.isPending}
                className="w-full"
              >
                {configureAutoTopup.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Auto Top-up Settings
                  </>
                )}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Top-up Form */}
      <Card>
        <CardHeader>
          <CardTitle>Top-up Amount</CardTitle>
          <CardDescription>Select or enter the amount to add</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant={amount === String(quickAmount) && !customAmount ? 'default' : 'outline'}
                  onClick={() => handleQuickAmount(quickAmount)}
                  className="flex-1 min-w-[100px]"
                >
                  {formatCurrency(quickAmount, currency)}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="customAmount">Custom Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currency}
              </span>
              <Input
                id="customAmount"
                type="number"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                className="pl-12"
                min="10"
                max="10000"
                step="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Min: {formatCurrency(10, currency)} | Max: {formatCurrency(10000, currency)}
            </p>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <TabsList className="w-full">
                <TabsTrigger value="card" className="flex-1">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Card
                </TabsTrigger>
                <TabsTrigger value="bank_transfer" className="flex-1">
                  <Building className="h-4 w-4 mr-2" />
                  Bank Transfer
                </TabsTrigger>
                <TabsTrigger value="ach" className="flex-1">
                  <Building className="h-4 w-4 mr-2" />
                  ACH
                </TabsTrigger>
              </TabsList>

              <TabsContent value="card" className="mt-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    Pay securely with your credit or debit card. Funds are added instantly.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="bank_transfer" className="mt-4">
                <BankTransferOption
                  selected={paymentMethod === 'bank_transfer'}
                  onSelect={() => setPaymentMethod('bank_transfer')}
                />
              </TabsContent>

              <TabsContent value="ach" className="mt-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    Connect your US bank account for ACH direct debit.
                    Processing time: 3-5 business days.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Summary & Continue */}
          {finalAmount > 0 && (
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount to add</span>
                <span className="font-semibold">{formatCurrency(finalAmount, currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">New balance</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(balance + finalAmount, currency)}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleContinueToPayment}
            className="w-full"
            size="lg"
            disabled={!finalAmount || finalAmount < 10 || createPaymentIntent.isPending}
          >
            {createPaymentIntent.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Preparing...
              </>
            ) : (
              <>
                Continue to Payment
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
