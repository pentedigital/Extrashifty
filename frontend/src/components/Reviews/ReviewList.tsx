import { Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StarRating } from '@/components/Ratings/StarRating'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { ReviewCard } from './ReviewCard'
import { cn } from '@/lib/utils'
import type { Review } from '@/hooks/api/useReviewsApi'

export interface ReviewListProps {
  /** Array of reviews to display */
  reviews: Review[]
  /** Average rating to display in summary */
  averageRating?: number | null
  /** Total number of reviews (may differ from reviews.length if paginated) */
  totalCount?: number
  /** Whether the list is loading */
  isLoading?: boolean
  /** Title for the review list section */
  title?: string
  /** Whether to show shift info on each review card */
  showShiftInfo?: boolean
  /** Empty state message when no reviews */
  emptyMessage?: string
  /** Empty state description when no reviews */
  emptyDescription?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * ReviewList - Displays a list of reviews with optional summary statistics
 */
export function ReviewList({
  reviews,
  averageRating,
  totalCount,
  isLoading = false,
  title = 'Reviews',
  showShiftInfo = true,
  emptyMessage = 'No reviews yet',
  emptyDescription = 'Reviews will appear here once they are submitted.',
  className,
}: ReviewListProps) {
  const displayTotal = totalCount ?? reviews.length

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {displayTotal > 0 && (
            <span className="text-sm text-muted-foreground">
              {displayTotal} review{displayTotal !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average rating summary */}
        {displayTotal > 0 && averageRating !== null && averageRating !== undefined && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-3xl font-bold">{averageRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">out of 5</p>
            </div>
            <div className="flex-1">
              <StarRating value={averageRating} readonly size="md" />
              <p className="text-sm text-muted-foreground mt-1">
                Based on {displayTotal} review{displayTotal !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Reviews list */}
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showShiftInfo={showShiftInfo}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Star}
            title={emptyMessage}
            description={emptyDescription}
          />
        )}
      </CardContent>
    </Card>
  )
}
