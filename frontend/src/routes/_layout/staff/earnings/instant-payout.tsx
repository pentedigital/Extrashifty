import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowLeft,
  Zap,
  Building,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  Info,
} from 'lucide-react'
import {
  useEarningsSummary,
  useRequestInstantPayout,
  useConnectAccountStatus,
} from '@/hooks/api/usePaymentsApi'
import { usePaymentMethods } from '@/hooks/api/useWalletApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_layout/staff/earnings/instant-payout')({
  component: InstantPayoutPage,
})

const INSTANT_PAYOUT_FEE_PERCENT = 0.015 // 1.5%
const MINIMUM_PAYOUT_AMOUNT = 10

function InstantPayoutPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { isStaff } = useAuth()

  const { data: summaryData, isLoading: summaryLoading } = useEarningsSummary()
  const { data: paymentMethodsData, isLoading: methodsLoading } = usePaymentMethods()
  const { isLoading: connectLoading } = useConnectAccountStatus()
  const instantPayout = useRequestInstantPayout()

  const [selectedMethodId, setSelectedMethodId] = useState<string>('')
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')

  const isLoading = summaryLoading || methodsLoading || connectLoading

  const availableBalance = summaryData?.available_balance ?? 0
  const paymentMethods = paymentMethodsData?.items ?? []
  const bankAccounts = paymentMethods.filter(m => m.type === 'bank_account')

  // Find default bank or first available
  const defaultBank = bankAccounts.find(b => b.is_default) || bankAccounts[0]
  const effectiveMethodId = selectedMethodId || (defaultBank ? String(defaultBank.id) : '')
  const selectedMethod = paymentMethods.find(m => String(m.id) === effectiveMethodId)

  const fee = availableBalance * INSTANT_PAYOUT_FEE_PERCENT
  const netAmount = availableBalance - fee
  const canPayout = availableBalance >= MINIMUM_PAYOUT_AMOUNT && bankAccounts.length > 0

  const bankOptions = bankAccounts.map(b => ({
    value: String(b.id),
    label: `Bank ****${b.last_four}${b.is_default ? ' (Default)' : ''}`,
  }))

  const handleContinue = () => {
    if (!effectiveMethodId) {
      addToast({
        type: 'error',
        title: 'Select a bank account',
        description: 'Please select a bank account to receive your payout.',
      })
      return
    }
    setStep('confirm')
  }

  const handleConfirm = async () => {
    try {
      await instantPayout.mutateAsync({
        amount: availableBalance,
        bank_account_id: effectiveMethodId,
      })
      setStep('success')
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Payout failed',
        description: err instanceof Error ? err.message : 'There was an error processing your payout. Please try again.',
      })
    }
  }

  // Show access denied for non-staff
  if (!isStaff && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/staff/earnings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Instant Payout</h1>
            <p className="text-muted-foreground">Get paid immediately</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Not available"
              description="Instant payouts are only available for staff users."
              action={
                <Link to="/dashboard">
                  <Button>Go to Dashboard</Button>
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
          <Link to="/staff/earnings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Instant Payout</h1>
            <p className="text-muted-foreground">Get paid immediately</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center py-8">
              <div className="p-4 bg-green-100 rounded-full mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Payout Initiated!</h2>
              <p className="text-muted-foreground text-center mb-2">
                Your instant payout of {formatCurrency(netAmount)} is on its way.
              </p>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Funds should arrive in your bank account ending in ****{selectedMethod?.last_four} within 30 minutes.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate({ to: '/staff/earnings' })}>
                  Back to Earnings
                </Button>
                <Link to="/staff/earnings/payouts">
                  <Button>View Payouts</Button>
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
          <Button variant="ghost" size="icon" onClick={() => setStep('form')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Confirm Instant Payout</h1>
            <p className="text-muted-foreground">Review and confirm your payout</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Payout Summary</CardTitle>
            <CardDescription>Review the details below before confirming</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available balance</span>
                <span className="font-medium">{formatCurrency(availableBalance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Instant payout fee (1.5%)</span>
                <span className="text-red-600">-{formatCurrency(fee)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                <span>You receive</span>
                <span className="text-green-600">{formatCurrency(netAmount)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-background rounded-full">
                <Building className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Transfer to</p>
                <p className="text-sm text-muted-foreground">
                  Bank account ****{selectedMethod?.last_four}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                ~30 min
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={instantPayout.isPending}
                className="flex-1 gap-2"
              >
                {instantPayout.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Confirm Payout
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
        <Link to="/staff/earnings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Instant Payout</h1>
          <p className="text-muted-foreground">Get paid immediately with a small fee</p>
        </div>
      </div>

      {/* Available Balance */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available for Instant Payout</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(availableBalance)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Zap className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Form */}
      <Card>
        <CardHeader>
          <CardTitle>Instant Payout Details</CardTitle>
          <CardDescription>
            Get your earnings transferred instantly to your bank account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {availableBalance < MINIMUM_PAYOUT_AMOUNT ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Minimum not met</p>
                <p className="text-sm text-yellow-700">
                  The minimum instant payout is {formatCurrency(MINIMUM_PAYOUT_AMOUNT)}.
                  You need {formatCurrency(MINIMUM_PAYOUT_AMOUNT - availableBalance)} more.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Fee Disclosure */}
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payout amount</span>
                  <span className="font-medium">{formatCurrency(availableBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Instant payout fee (1.5%)
                  </span>
                  <span className="text-red-600">-{formatCurrency(fee)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>You receive</span>
                  <span className="text-green-600">{formatCurrency(netAmount)}</span>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Standard payouts (no fee) are processed every Friday. Use instant payout to get paid now.
                </p>
              </div>

              {/* Bank Selection */}
              {bankAccounts.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Transfer to</Label>
                  <Select
                    id="bankAccount"
                    value={effectiveMethodId}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    options={bankOptions}
                    placeholder="Select bank account"
                  />
                  {selectedMethod && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Funds arrive in approximately 30 minutes</span>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={Building}
                  title="No bank accounts"
                  description="You need to add a bank account before you can receive instant payouts."
                  action={
                    <Link to="/wallet/payment-methods">
                      <Button>Add Bank Account</Button>
                    </Link>
                  }
                />
              )}
            </>
          )}

          {canPayout && (
            <Button onClick={handleContinue} className="w-full gap-2">
              <Zap className="h-4 w-4" />
              Continue to Review
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
