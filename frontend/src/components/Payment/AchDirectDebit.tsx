import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building, Shield, Clock, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AchDirectDebitProps {
  onSetup?: () => void
  isConnected?: boolean
  accountLast4?: string
  bankName?: string
  className?: string
}

/**
 * ACH Direct Debit component for US bank account payments.
 * Allows users to connect their bank account for direct debit payments.
 */
export function AchDirectDebit({
  onSetup,
  isConnected = false,
  accountLast4,
  bankName,
  className,
}: AchDirectDebitProps) {
  if (isConnected && accountLast4) {
    return (
      <Card className={cn('border-green-200 bg-green-50/50', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Building className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">Bank Account Connected</p>
                <p className="text-sm text-green-700">
                  {bankName || 'Bank'} ****{accountLast4}
                </p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-muted-foreground" />
          <CardTitle>ACH Direct Debit</CardTitle>
        </div>
        <CardDescription>
          Connect your US bank account for direct payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Benefits */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-full bg-blue-100 mt-0.5">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Secure Connection</p>
              <p className="text-xs text-muted-foreground">
                Bank-level encryption protects your account details
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-full bg-blue-100 mt-0.5">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Lower Fees</p>
              <p className="text-xs text-muted-foreground">
                Typically lower processing fees than card payments
              </p>
            </div>
          </div>
        </div>

        {/* Processing Time Notice */}
        <div className="p-3 rounded-lg bg-muted">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              ACH transfers typically take 3-5 business days to process.
              For instant payments, consider using a card instead.
            </p>
          </div>
        </div>

        {/* Setup Button */}
        <Button onClick={onSetup} className="w-full">
          <Building className="h-4 w-4 mr-2" />
          Connect Bank Account
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * ACH option button for payment method selection
 */
export function AchOption({
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
          <p className="font-medium">ACH Direct Debit</p>
          <p className="text-sm text-muted-foreground">
            Pay directly from your US bank account
          </p>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Processing time: 3-5 business days
      </div>
    </button>
  )
}
