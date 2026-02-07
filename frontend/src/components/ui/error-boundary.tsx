/**
 * TanStack Router Error Boundary Components
 *
 * These components are designed for use with TanStack Router's errorComponent prop.
 * For generic React error boundaries, import from '@/components/ErrorBoundary'.
 */

import { Link, useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/Logo'

/* eslint-disable react-refresh/only-export-components */
export {
  ErrorBoundary,
  ErrorFallback,
  useErrorBoundary,
  type ErrorBoundaryProps,
  type ErrorFallbackProps,
} from '@/components/ErrorBoundary'
/* eslint-enable react-refresh/only-export-components */

interface ErrorDisplayProps {
  /** The error that occurred */
  error: Error
  /** Whether to show within authenticated layout (no full page chrome) */
  minimal?: boolean
  /** Custom title for the error page */
  title?: string
  /** Optional reset function to retry */
  onReset?: () => void
}

/**
 * Rich error display component for route errors.
 * Includes navigation options (Dashboard, Go Back) and router integration.
 */
export function ErrorDisplay({
  error,
  minimal = false,
  title = 'Something went wrong',
  onReset,
}: ErrorDisplayProps) {
  const router = useRouter()

  const handleRefresh = () => {
    if (onReset) {
      onReset()
    } else {
      router.invalidate()
    }
  }

  const content = (
    <div className="text-center">
      {/* Error Icon */}
      <div className="mb-6">
        <div className="mx-auto w-fit rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
      </div>

      {/* Message */}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">
        {title}
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-2">
        An unexpected error occurred. We apologize for the inconvenience.
      </p>

      {/* Error Details (development only) */}
      {import.meta.env.DEV && error?.message && (
        <div className="mt-4 mb-6 p-4 rounded-lg bg-muted text-left max-w-md mx-auto">
          <p className="text-xs font-mono text-muted-foreground break-all">
            {error.message}
          </p>
          {error.stack && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Stack trace
              </summary>
              <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all overflow-auto max-h-48">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    </div>
  )

  if (minimal) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 pb-10">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          {content}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Route error boundary component for TanStack Router.
 * Use this as the errorComponent in route definitions.
 * Shows full-page error with navigation options.
 */
export function RouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  return <ErrorDisplay error={error} onReset={reset} />
}

/**
 * Minimal route error boundary for use within authenticated layouts.
 * Shows error without full page chrome (no card wrapper, no logo).
 */
export function LayoutErrorBoundary({ error, reset }: ErrorComponentProps) {
  return <ErrorDisplay error={error} onReset={reset} minimal />
}
