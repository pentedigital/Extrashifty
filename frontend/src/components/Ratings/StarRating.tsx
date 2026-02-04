'use client'

import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StarRatingProps {
  /** Current rating value (0-5) */
  value: number
  /** Callback when rating changes (only called if not readonly) */
  onChange?: (value: number) => void
  /** If true, the rating cannot be changed */
  readonly?: boolean
  /** Size of the stars */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
  /** Show the rating value as text */
  showValue?: boolean
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const gapClasses = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1.5',
}

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  className,
  showValue = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)

  const displayValue = hoverValue !== null ? hoverValue : value
  const isInteractive = !readonly && onChange

  const handleClick = (rating: number) => {
    if (isInteractive) {
      onChange(rating)
    }
  }

  const handleMouseEnter = (rating: number) => {
    if (isInteractive) {
      setHoverValue(rating)
    }
  }

  const handleMouseLeave = () => {
    if (isInteractive) {
      setHoverValue(null)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent, rating: number) => {
    if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onChange(rating)
    }
  }

  return (
    <div
      className={cn('inline-flex items-center', gapClasses[size], className)}
      role={isInteractive ? 'radiogroup' : 'img'}
      aria-label={`Rating: ${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const isFilled = rating <= displayValue
        const isPartiallyFilled = !isFilled && rating - 0.5 <= displayValue

        return (
          <span
            key={rating}
            className={cn(
              'relative',
              isInteractive && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm'
            )}
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            onKeyDown={(e) => handleKeyDown(e, rating)}
            tabIndex={isInteractive ? 0 : undefined}
            role={isInteractive ? 'radio' : undefined}
            aria-checked={isInteractive ? rating === value : undefined}
            aria-label={isInteractive ? `${rating} star${rating !== 1 ? 's' : ''}` : undefined}
          >
            {/* Background (empty) star */}
            <Star
              className={cn(
                sizeClasses[size],
                'text-muted-foreground/30',
                isInteractive && 'transition-colors'
              )}
            />
            {/* Filled star overlay */}
            {(isFilled || isPartiallyFilled) && (
              <Star
                className={cn(
                  sizeClasses[size],
                  'absolute inset-0 text-yellow-400 fill-yellow-400',
                  isInteractive && 'transition-colors',
                  isPartiallyFilled && 'clip-path-half'
                )}
                style={
                  isPartiallyFilled
                    ? { clipPath: 'inset(0 50% 0 0)' }
                    : undefined
                }
              />
            )}
          </span>
        )
      })}
      {showValue && (
        <span className={cn('ml-1 text-muted-foreground', textSizeClasses[size])}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}
