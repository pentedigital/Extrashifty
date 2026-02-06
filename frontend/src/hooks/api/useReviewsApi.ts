import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ReviewType = 'staff_to_company' | 'company_to_staff'

export interface Review {
  id: number
  reviewer_id: number
  reviewee_id: number
  shift_id: number
  rating: number
  comment: string | null
  review_type: ReviewType
  created_at: string
  reviewer_name: string | null
  reviewee_name: string | null
}

export interface ReviewListResponse {
  items: Review[]
  total: number
  average_rating: number | null
}

export interface CreateReviewData {
  reviewee_id: number
  shift_id: number
  rating: number
  comment?: string
  review_type: ReviewType
}

export const reviewKeys = {
  all: ['reviews'] as const,
  staff: (staffId: string) => [...reviewKeys.all, 'staff', staffId] as const,
  staffList: (staffId: string, params?: Record<string, string>) =>
    [...reviewKeys.staff(staffId), 'list', params] as const,
  company: (companyId: string) => [...reviewKeys.all, 'company', companyId] as const,
  companyList: (companyId: string, params?: Record<string, string>) =>
    [...reviewKeys.company(companyId), 'list', params] as const,
  shift: (shiftId: string) => [...reviewKeys.all, 'shift', shiftId] as const,
  shiftList: (shiftId: string, params?: Record<string, string>) =>
    [...reviewKeys.shift(shiftId), 'list', params] as const,
}

export function useStaffReviews(staffId: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: reviewKeys.staffList(staffId, params),
    queryFn: () => api.reviews.getStaffReviews(staffId, params),
    enabled: !!staffId,
  })
}

export function useCompanyReviews(companyId: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: reviewKeys.companyList(companyId, params),
    queryFn: () => api.reviews.getCompanyReviews(companyId, params),
    enabled: !!companyId,
  })
}

export function useShiftReviews(shiftId: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: reviewKeys.shiftList(shiftId, params),
    queryFn: () => api.reviews.getShiftReviews(shiftId, params),
    enabled: !!shiftId,
  })
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateReviewData) => api.reviews.create(data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries based on review type
      if (variables.review_type === 'staff_to_company') {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.company(String(variables.reviewee_id)),
        })
      } else {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.staff(String(variables.reviewee_id)),
        })
      }
      // Always invalidate shift reviews
      queryClient.invalidateQueries({
        queryKey: reviewKeys.shift(String(variables.shift_id)),
      })
    },
  })
}
