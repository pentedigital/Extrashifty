import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface FallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
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

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onReset?: () => void
  onError?: (error: Error, info: React.ErrorInfo) => void
}

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

// Re-export for convenience
export { useErrorBoundary } from 'react-error-boundary'
