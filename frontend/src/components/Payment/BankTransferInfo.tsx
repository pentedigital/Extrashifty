import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building, Copy, Check, Info } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface BankTransferInfoProps {
  amount: number
  currency?: string
  reference: string
  accountDetails?: {
    account_name: string
    iban: string
    bic: string
    bank_name: string
  }
  onComplete?: () => void
}

/**
 * Display bank transfer instructions for manual top-up.
 * Shows account details and payment reference.
 */
export function BankTransferInfo({
  amount,
  currency = 'EUR',
  reference,
  accountDetails = {
    account_name: 'ExtraShifty Ltd',
    iban: 'IE29 AIBK 9311 5212 3456 78',
    bic: 'AIBKIE2D',
    bank_name: 'Allied Irish Banks',
  },
  onComplete,
}: BankTransferInfoProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      if (import.meta.env.DEV) console.error('Failed to copy to clipboard')
    }
  }

  const CopyButton = ({ value, field }: { value: string; field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2"
      onClick={() => copyToClipboard(value, field)}
    >
      {copiedField === field ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )

  return (
    <div className="space-y-6">
      {/* Amount Card */}
      <Card className="border-brand-200 bg-brand-50/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Transfer Amount</p>
            <p className="text-3xl font-bold text-brand-600">{formatCurrency(amount, currency)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Bank Transfer Details</CardTitle>
          </div>
          <CardDescription>
            Transfer the exact amount to the following account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Name */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Account Name</p>
              <p className="font-medium">{accountDetails.account_name}</p>
            </div>
            <CopyButton value={accountDetails.account_name} field="account_name" />
          </div>

          {/* IBAN */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">IBAN</p>
              <p className="font-mono font-medium">{accountDetails.iban}</p>
            </div>
            <CopyButton value={accountDetails.iban.replace(/\s/g, '')} field="iban" />
          </div>

          {/* BIC */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">BIC/SWIFT</p>
              <p className="font-mono font-medium">{accountDetails.bic}</p>
            </div>
            <CopyButton value={accountDetails.bic} field="bic" />
          </div>

          {/* Bank Name */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Bank Name</p>
              <p className="font-medium">{accountDetails.bank_name}</p>
            </div>
          </div>

          {/* Payment Reference */}
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <p className="text-sm text-yellow-800">Payment Reference (Required)</p>
              <p className="font-mono font-bold text-yellow-900">{reference}</p>
            </div>
            <CopyButton value={reference} field="reference" />
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-blue-900">Important</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>Include the payment reference exactly as shown</li>
                <li>Transfers typically take 1-2 business days to process</li>
                <li>Your wallet will be credited once the transfer is confirmed</li>
                <li>For urgent needs, consider using card payment instead</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Badge */}
      <div className="flex items-center justify-center gap-2">
        <Badge variant="secondary" className="gap-2">
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          Awaiting Transfer
        </Badge>
      </div>

      {onComplete && (
        <Button variant="outline" className="w-full" onClick={onComplete}>
          I've Made the Transfer
        </Button>
      )}
    </div>
  )
}

/**
 * Compact bank transfer option for payment method selection
 */
export function BankTransferOption({
  selected,
  onSelect,
  className,
}: {
  selected?: boolean
  onSelect?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full p-4 rounded-lg border-2 transition-colors text-left',
        selected
          ? 'border-brand-600 bg-brand-50'
          : 'border-muted hover:border-brand-300',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-full',
          selected ? 'bg-brand-100' : 'bg-muted'
        )}>
          <Building className={cn(
            'h-5 w-5',
            selected ? 'text-brand-600' : 'text-muted-foreground'
          )} />
        </div>
        <div>
          <p className="font-medium">Bank Transfer</p>
          <p className="text-sm text-muted-foreground">
            Transfer directly from your bank account
          </p>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Processing time: 1-2 business days
      </div>
    </button>
  )
}
