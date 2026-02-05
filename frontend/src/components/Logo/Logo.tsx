import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'default' | 'lg'
  showText?: boolean
  linkTo?: string
  className?: string
  'aria-label'?: string
}

export function Logo({ size = 'default', showText = true, linkTo, className, 'aria-label': ariaLabel }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    default: 'h-8 w-8 text-sm',
    lg: 'h-12 w-12 text-lg',
  }

  const textSizeClasses = {
    sm: 'text-base',
    default: 'text-xl',
    lg: 'text-2xl',
  }

  const content = (
    <div className={cn('flex items-center gap-2', className)} aria-label={ariaLabel} role={ariaLabel ? 'img' : undefined}>
      <div className={cn(
        'flex items-center justify-center rounded-lg bg-brand-600 font-bold text-white',
        sizeClasses[size]
      )} aria-hidden={ariaLabel ? 'true' : undefined}>
        E
      </div>
      {showText && (
        <span className={cn('font-semibold', textSizeClasses[size])}>
          ExtraShifty
        </span>
      )}
    </div>
  )

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>
  }
  return content
}
