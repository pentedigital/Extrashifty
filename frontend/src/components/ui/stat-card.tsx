import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconColor?: 'brand' | 'success' | 'warning' | 'info' | 'destructive' | 'muted'
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

const iconColorMap = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'muted',
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 text-xl sm:text-2xl font-semibold tabular-nums animate-count-up">
            {value}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={cn('shrink-0 rounded-lg p-2.5', iconColorMap[iconColor])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}
