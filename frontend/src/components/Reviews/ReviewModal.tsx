import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ReviewForm } from './ReviewForm'
import type { ReviewType } from '@/hooks/api/useReviewsApi'

export interface ReviewModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback to change the open state */
  onOpenChange: (open: boolean) => void
  /** The ID of the user being reviewed */
  revieweeId: number
  /** Name of the reviewee for display */
  revieweeName?: string
  /** The ID of the shift associated with this review */
  shiftId: number
  /** Title of the shift for display */
  shiftTitle?: string
  /** The type of review */
  reviewType: ReviewType
  /** Callback when review is successfully submitted */
  onSuccess?: () => void
}

/**
 * ReviewModal - Modal dialog for submitting a review after shift completion
 */
export function ReviewModal({
  open,
  onOpenChange,
  revieweeId,
  revieweeName,
  shiftId,
  shiftTitle,
  reviewType,
  onSuccess,
}: ReviewModalProps) {
  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  // Determine the description based on review type
  const getDescription = () => {
    if (reviewType === 'staff_to_company') {
      return revieweeName
        ? `Share your experience working with ${revieweeName}${shiftTitle ? ` on "${shiftTitle}"` : ''}.`
        : 'Share your experience working with this company.'
    }
    return revieweeName
      ? `Rate ${revieweeName}'s performance${shiftTitle ? ` on "${shiftTitle}"` : ''}.`
      : 'Rate this worker\'s performance on the shift.'
  }

  const getTitle = () => {
    if (reviewType === 'staff_to_company') {
      return 'Review Company'
    }
    return 'Review Worker'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        <ReviewForm
          revieweeId={revieweeId}
          shiftId={shiftId}
          reviewType={reviewType}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}
