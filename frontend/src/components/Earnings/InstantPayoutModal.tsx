import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Loader2, Zap, Check, AlertCircle, Building } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BankAccount {
  id: string
  last_four: string
  bank_name: string
  is_default: boolean
}

interface InstantPayoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableBalance: number
  bankAccounts: BankAccount[]
  currency?: string
  onConfirm: (bankAccountId: string) => Promise<void>
  isProcessing?: boolean
}

const INSTANT_PAYOUT_FEE_PERCENT = 0.015 // 1.5%
const MINIMUM_PAYOUT_AMOUNT = 10

export function InstantPayoutModal({
  open,
  onOpenChange,
  availableBalance,
  bankAccounts,
  currency = 'EUR',
  onConfirm,
  isProcessing = false,
}: InstantPayoutModalProps) {
  const [selectedBankId, setSelectedBankId] = useState<string>(
    bankAccounts.find(b => b.is_default)?.id || bankAccounts[0]?.id || ''
  )
  const [step, setStep] = useState<'confirm' | 'success' | 'error'>('confirm')
  const [error, setError] = useState<string>('')

  const fee = availableBalance * INSTANT_PAYOUT_FEE_PERCENT
  const netAmount = availableBalance - fee
  const canPayout = availableBalance >= MINIMUM_PAYOUT_AMOUNT && bankAccounts.length > 0

  const bankOptions = bankAccounts.map(b => ({
    value: b.id,
    label: `${b.bank_name} ****${b.last_four}${b.is_default ? ' (Default)' : ''}`,
  }))

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId)

  const handleConfirm = async () => {
    if (!selectedBankId) {
      setError('Please select a bank account')
      return
    }

    try {
      setError('')
      await onConfirm(selectedBankId)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process instant payout')
      setStep('error')
    }
  }

  const handleClose = () => {
    setStep('confirm')
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'success' ? (
          <>
            <DialogHeader>
              <div className="mx-auto p-4 bg-green-100 rounded-full mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-center">Payout Initiated!</DialogTitle>
              <DialogDescription className="text-center">
                Your instant payout of {formatCurrency(netAmount, currency)} is on its way.
                Funds should arrive within 30 minutes.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : step === 'error' ? (
          <>
            <DialogHeader>
              <div className="mx-auto p-4 bg-red-100 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <DialogTitle className="text-center">Payout Failed</DialogTitle>
              <DialogDescription className="text-center">
                {error || 'Something went wrong. Please try again.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep('confirm')}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Instant Payout
              </DialogTitle>
              <DialogDescription>
                Get your earnings immediately with a small fee
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Amount breakdown */}
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available balance</span>
                  <span className="font-medium">{formatCurrency(availableBalance, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Instant payout fee (1.5%)
                  </span>
                  <span className="text-red-600">-{formatCurrency(fee, currency)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>You receive</span>
                  <span className="text-green-600">{formatCurrency(netAmount, currency)}</span>
                </div>
              </div>

              {/* Minimum check */}
              {availableBalance < MINIMUM_PAYOUT_AMOUNT && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    Minimum instant payout is {formatCurrency(MINIMUM_PAYOUT_AMOUNT, currency)}.
                    You need {formatCurrency(MINIMUM_PAYOUT_AMOUNT - availableBalance, currency)} more.
                  </div>
                </div>
              )}

              {/* Bank selection */}
              {bankAccounts.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Transfer to</Label>
                  <Select
                    id="bankAccount"
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    options={bankOptions}
                    placeholder="Select bank account"
                  />
                  {selectedBank && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="h-4 w-4" />
                      <span>Funds arrive in ~30 minutes</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    No bank accounts found. Please add a bank account in your payment settings first.
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!canPayout || isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Get Paid Now
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
