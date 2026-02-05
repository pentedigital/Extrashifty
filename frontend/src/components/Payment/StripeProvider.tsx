import { ReactNode, useMemo } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import type { Stripe } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'

// Get Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

// Lazy load Stripe to avoid loading it on every page
let stripePromise: Promise<Stripe | null> | null = null

function getStripe() {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

interface StripeProviderProps {
  children: ReactNode
  clientSecret?: string
}

/**
 * StripeProvider wraps children with Stripe Elements context.
 * Can be used with or without a client secret.
 *
 * Without client secret: Basic Elements setup for collecting payment details
 * With client secret: Full payment flow with PaymentIntent
 */
export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  const stripe = useMemo(() => getStripe(), [])

  const options = useMemo(() => {
    const baseOptions = {
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#2563eb', // brand-600
          colorBackground: '#ffffff',
          colorText: '#1f2937',
          colorDanger: '#dc2626',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: '6px',
          spacingUnit: '4px',
        },
        rules: {
          '.Input': {
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          },
          '.Input:focus': {
            border: '1px solid #2563eb',
            boxShadow: '0 0 0 1px #2563eb',
          },
          '.Label': {
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px',
          },
        },
      },
    }

    if (clientSecret) {
      return {
        ...baseOptions,
        clientSecret,
      }
    }

    return baseOptions
  }, [clientSecret])

  if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn('Stripe publishable key not configured')
    return <>{children}</>
  }

  if (!stripe) {
    return <>{children}</>
  }

  return (
    <Elements stripe={stripe} options={options}>
      {children}
    </Elements>
  )
}

/**
 * Hook to check if Stripe is configured and available
 */
export function useStripeAvailable(): boolean {
  return !!STRIPE_PUBLISHABLE_KEY
}
