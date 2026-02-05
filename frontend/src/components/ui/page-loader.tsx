import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

interface PageLoaderProps {
  /** Custom class names */
  className?: string
  /** Loading message to display */
  message?: string
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg'
  /** Minimum height for the loader container */
  minHeight?: string
}

/**
 * Full-page loading indicator for route transitions.
 * Use as pendingComponent in route definitions.
 */
export function PageLoader({
  className,
  message = 'Loading...',
  size = 'lg',
  minHeight = 'min-h-[60vh]',
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        minHeight,
        className
      )}
    >
      <Spinner size={size} className="mb-4" />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  )
}

/**
 * Card-level loading skeleton for content sections.
 */
export function CardLoader({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="h-8 bg-muted rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
    </div>
  )
}

/**
 * Table loading skeleton for data tables.
 */
export function TableLoader({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn('animate-pulse', className)}>
      {/* Header */}
      <div className="flex gap-4 pb-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 bg-muted rounded flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 py-4 border-b last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 bg-muted rounded flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Stats card loading skeleton.
 */
export function StatsLoader({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('grid gap-4', className)} style={{ gridTemplateColumns: `repeat(${Math.min(count, 4)}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border p-6">
          <div className="h-4 bg-muted rounded w-1/2 mb-3" />
          <div className="h-8 bg-muted rounded w-3/4" />
        </div>
      ))}
    </div>
  )
}
