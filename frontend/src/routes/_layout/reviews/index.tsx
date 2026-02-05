import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Star, Filter, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useStaffReviews, useCompanyReviews } from '@/hooks/api/useReviewsApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StarRating } from '@/components/Ratings/StarRating'
import { ReviewCard } from '@/components/Reviews/ReviewCard'

export const Route = createFileRoute('/_layout/reviews/')({
  component: ReviewsPage,
})

const ratingFilterOptions = [
  { value: 'all', label: 'All Ratings' },
  { value: '5', label: '5 Stars' },
  { value: '4', label: '4 Stars' },
  { value: '3', label: '3 Stars' },
  { value: '2', label: '2 Stars' },
  { value: '1', label: '1 Star' },
]

function ReviewsPage() {
  const { user, userType } = useAuth()
  const [ratingFilter, setRatingFilter] = useState('all')

  // Build query params for filtering
  const queryParams: Record<string, string> = {}
  if (ratingFilter !== 'all') {
    queryParams.rating = ratingFilter
  }

  // Fetch reviews based on user type
  const staffReviewsQuery = useStaffReviews(
    userType === 'staff' ? String(user?.id || '') : '',
    userType === 'staff' ? queryParams : undefined
  )
  const companyReviewsQuery = useCompanyReviews(
    userType === 'company' ? String(user?.id || '') : '',
    userType === 'company' ? queryParams : undefined
  )

  // Determine which query to use
  const isStaff = userType === 'staff'
  const reviewsData = isStaff ? staffReviewsQuery.data : companyReviewsQuery.data
  const isLoading = isStaff ? staffReviewsQuery.isLoading : companyReviewsQuery.isLoading
  const isError = isStaff ? staffReviewsQuery.isError : companyReviewsQuery.isError
  const error = isStaff ? staffReviewsQuery.error : companyReviewsQuery.error

  const reviews = reviewsData?.items || []
  const totalCount = reviewsData?.total || 0
  const averageRating = reviewsData?.average_rating

  // Get rating distribution for summary
  const getRatingCounts = () => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach((review) => {
      const roundedRating = Math.round(review.rating) as keyof typeof counts
      if (roundedRating in counts) {
        counts[roundedRating]++
      }
    })
    return counts
  }

  const ratingCounts = getRatingCounts()

  // Page title and description based on user type
  const pageTitle = isStaff ? 'My Reviews' : 'Reviews Given'
  const pageDescription = isStaff
    ? 'Reviews you have received from companies'
    : 'Reviews you have given to workers'

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>
                {error instanceof Error
                  ? error.message
                  : 'Failed to load reviews. Please try again.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />

      {/* Rating Summary Card */}
      {totalCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rating Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Overall rating */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    {averageRating?.toFixed(1) || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">out of 5</p>
                </div>
                <div>
                  <StarRating
                    value={averageRating || 0}
                    readonly
                    size="lg"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on {totalCount} review{totalCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Rating breakdown */}
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingCounts[stars as keyof typeof ratingCounts]
                  const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0

                  return (
                    <div key={stars} className="flex items-center gap-2 text-sm">
                      <span className="w-12 flex items-center gap-1">
                        {stars}
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-muted-foreground text-right">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          options={ratingFilterOptions}
          className="w-36"
        />
        {ratingFilter !== 'all' && (
          <Badge variant="secondary">
            {ratingFilter} star{ratingFilter !== '1' ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              showShiftInfo
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Star}
              title={ratingFilter !== 'all' ? 'No reviews match this filter' : 'No reviews yet'}
              description={
                ratingFilter !== 'all'
                  ? 'Try selecting a different rating filter.'
                  : isStaff
                    ? 'Complete shifts to start receiving reviews from companies.'
                    : 'Review workers after they complete shifts.'
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
