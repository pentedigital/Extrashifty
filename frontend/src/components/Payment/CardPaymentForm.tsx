import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, Lock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface CardPaymentFormProps {
  amount: number
  currency?: string
  onSuccess: () => void
  onError: (error: string) => void
  submitLabel?: string
  isProcessing?: boolean
}

/**
 * Card payment form using Stripe Elements PaymentElement.
 * This component handles the card input and payment confirmation.
 */
export function CardPaymentForm({
  amount,
  currency = 'EUR',
  onSuccess,
  onError,
  submitLabel = 'Pay Now',
  isProcessing = false,
}: CardPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/wallet?payment=success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        setErrorMessage(error.message || 'Payment failed. Please try again.')
        onError(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess()
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // Handle 3D Secure or other authentication
        setErrorMessage('Additional authentication required. Please complete the verification.')
      } else {
        setErrorMessage('Payment is being processed. Please wait.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMessage(message)
      onError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = isSubmitting || isProcessing || !stripe || !elements

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <CreditCard className="h-4 w-4" />
          <span>Enter your card details</span>
        </div>

        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {errorMessage}
        </div>
      )}

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground">Amount to pay</span>
          <span className="text-xl font-bold">{formatCurrency(amount, currency)}</span>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              {submitLabel} {formatCurrency(amount, currency)}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Payments are securely processed by Stripe
        </p>
      </div>
    </form>
  )
}

/**
 * Simple card input component for collecting card details only
 * (without immediate payment processing)
 */
export function CardInputForm({
  onReady,
  onChange,
}: {
  onReady?: () => void
  onChange?: (complete: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <CreditCard className="h-4 w-4" />
        <span>Card details</span>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
        onReady={onReady}
        onChange={(event) => onChange?.(event.complete)}
      />

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Secured by Stripe
      </p>
    </div>
  )
}
