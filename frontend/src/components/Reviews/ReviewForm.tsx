import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from '@/components/Ratings/StarRating'
import { Spinner } from '@/components/ui/spinner'
import { FormFieldWrapper } from '@/components/ui/form-field'
import { useCreateReview, type CreateReviewData, type ReviewType } from '@/hooks/api/useReviewsApi'
import { cn } from '@/lib/utils'

// Zod schema for review form validation
const reviewFormSchema = z.object({
  rating: z
    .number()
    .min(1, 'Please select a rating')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z
    .string()
    .max(500, 'Comment must be 500 characters or less')
    .optional()
    .transform((val) => val?.trim() || undefined),
})

type ReviewFormData = z.infer<typeof reviewFormSchema>

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
 * Uses react-hook-form with Zod validation
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
  const createReview = useCreateReview()

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  })

  const rating = watch('rating')
  const comment = watch('comment') || ''

  const onSubmit = async (data: ReviewFormData) => {
    const reviewData: CreateReviewData = {
      reviewee_id: revieweeId,
      shift_id: shiftId,
      rating: data.rating,
      review_type: reviewType,
      ...(data.comment && { comment: data.comment }),
    }

    try {
      await createReview.mutateAsync(reviewData)
      reset()
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review'
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    }
  }

  const isPending = isSubmitting || createReview.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-4', className)}>
      {/* Rating selector */}
      <Controller
        name="rating"
        control={control}
        render={({ field, fieldState }) => (
          <FormFieldWrapper
            id="rating"
            label="Rating"
            error={fieldState.error}
            required
            helperText={!fieldState.error ? 'Click on a star to select your rating' : undefined}
          >
            <div className="flex items-center gap-3">
              <StarRating
                value={field.value}
                onChange={field.onChange}
                size="lg"
              />
              {field.value > 0 && (
                <span className="text-sm text-muted-foreground">
                  {field.value} star{field.value !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </FormFieldWrapper>
        )}
      />

      {/* Comment textarea */}
      <div className="space-y-2">
        <FormFieldWrapper
          id="comment"
          label="Comment"
          error={errors.comment}
          required={false}
        >
          <Textarea
            id="comment"
            placeholder="Share your experience..."
            rows={4}
            maxLength={500}
            disabled={isPending}
            aria-invalid={errors.comment ? 'true' : 'false'}
            aria-describedby={errors.comment ? 'comment-error' : 'comment-helper'}
            className={cn(errors.comment && 'border-destructive')}
            {...register('comment')}
          />
        </FormFieldWrapper>
        {!errors.comment && (
          <p id="comment-helper" className="text-xs text-muted-foreground text-right">
            {comment.length}/500 characters
          </p>
        )}
      </div>

      {/* API Error message */}
      {createReview.isError && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md" role="alert">
          {createReview.error instanceof Error
            ? createReview.error.message
            : 'Failed to submit review'}
        </div>
      )}

      {/* Form actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending || rating === 0}>
          {isPending ? (
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
