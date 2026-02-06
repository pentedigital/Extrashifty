import { Card, CardContent } from '@/components/ui/card'
import { StarRating } from '@/components/Ratings/StarRating'
import { Calendar, Briefcase } from 'lucide-react'
import { cn, formatReviewDate } from '@/lib/utils'
import type { Review } from '@/hooks/api/useReviewsApi'

export interface ReviewCardProps {
  /** The review data to display */
  review: Review
  /** Whether to show shift info */
  showShiftInfo?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * ReviewCard - Displays a single review with rating, reviewer info, and comment
 */
export function ReviewCard({
  review,
  showShiftInfo = true,
  className,
}: ReviewCardProps) {
  const reviewerName = review.reviewer_name || 'Anonymous'

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with rating and date */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <StarRating value={review.rating} readonly size="sm" />
              <span className="text-sm font-medium">{review.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatReviewDate(review.created_at)}</span>
            </div>
          </div>

          {/* Reviewer name */}
          <div className="text-sm">
            <span className="text-muted-foreground">By </span>
            <span className="font-medium">{reviewerName}</span>
          </div>

          {/* Comment */}
          {review.comment && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {review.comment}
            </p>
          )}

          {/* Shift info */}
          {showShiftInfo && review.shift_id && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
              <Briefcase className="h-3 w-3" />
              <span>Shift #{review.shift_id}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
