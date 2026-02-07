/**
 * Error Boundary - Single source of truth for error handling components
 *
 * This module provides:
 * - ErrorBoundary: React error boundary wrapper (uses react-error-boundary)
 * - ErrorFallback: Reusable fallback component for generic error boundaries
 * - useErrorBoundary: Hook for programmatic error boundary control
 *
 * For TanStack Router specific error components, see:
 * - RouteErrorBoundary: Full-page error for route definitions
 * - LayoutErrorBoundary: Minimal error for authenticated layouts
 */

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

/**
 * Reusable error fallback component for React error boundaries.
 * Shows error message with retry option and dev-only stack trace.
 */
export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4 max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={resetErrorBoundary} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
      {import.meta.env.DEV && (
        <details className="mt-4 text-left text-sm text-muted-foreground max-w-lg">
          <summary className="cursor-pointer hover:text-foreground">
            Error details (dev only)
          </summary>
          <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto text-xs">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  )
}

export interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Custom fallback element to render on error */
  fallback?: React.ReactNode
  /** Callback when error boundary resets */
  onReset?: () => void
  /** Callback when an error is caught */
  onError?: (error: Error, info: React.ErrorInfo) => void
}

/**
 * React Error Boundary wrapper component.
 * Catches JavaScript errors in child component tree and displays fallback UI.
 */
export function ErrorBoundary({
  children,
  fallback,
  onReset,
  onError,
}: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback ? () => <>{fallback}</> : ErrorFallback}
      onReset={onReset}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { useErrorBoundary } from 'react-error-boundary'
