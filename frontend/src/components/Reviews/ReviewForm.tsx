import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StarRating } from '@/components/Ratings/StarRating'
import { Spinner } from '@/components/ui/spinner'
import { useCreateReview, type CreateReviewData, type ReviewType } from '@/hooks/api/useReviewsApi'
import { cn } from '@/lib/utils'

export interface ReviewFormProps {
  /** The ID of the user being reviewed */
  revieweeId: number
  /** The ID of the shift associated with this review */
  shiftId: number
  /** The type of review (staff reviewing company or company reviewing staff) */
  reviewType: ReviewType
  /** Callback when review is successfully submitted */
  onSuccess?: () => void
  /** Callback when review submission fails */
  onError?: (error: Error) => void
  /** Callback to cancel/close the form */
  onCancel?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * ReviewForm - Form for submitting a new review
 * Includes star rating selector and comment textarea
 */
export function ReviewForm({
  revieweeId,
  shiftId,
  reviewType,
  onSuccess,
  onError,
  onCancel,
  className,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createReview = useCreateReview()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    const data: CreateReviewData = {
      reviewee_id: revieweeId,
      shift_id: shiftId,
      rating,
      review_type: reviewType,
      ...(comment.trim() && { comment: comment.trim() }),
    }

    try {
      await createReview.mutateAsync(data)
      setRating(0)
      setComment('')
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review'
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    }
  }

  const isSubmitting = createReview.isPending

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* Rating selector */}
      <div className="space-y-2">
        <Label htmlFor="rating" className="text-sm font-medium">
          Rating <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-3">
          <StarRating
            value={rating}
            onChange={setRating}
            size="lg"
          />
          {rating > 0 && (
            <span className="text-sm text-muted-foreground">
              {rating} star{rating !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Click on a star to select your rating
        </p>
      </div>

      {/* Comment textarea */}
      <div className="space-y-2">
        <Label htmlFor="comment" className="text-sm font-medium">
          Comment <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="comment"
          placeholder="Share your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={500}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground text-right">
          {comment.length}/500 characters
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {/* Form actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || rating === 0}>
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </Button>
      </div>
    </form>
  )
}
