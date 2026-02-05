import { useMemo, useState, useCallback } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Check,
  X,
  Calendar,
  MessageSquare,
  AlertCircle,
  Loader2,
  Users,
  Euro,
  Clock,
  Wallet,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useShiftApplicants, useUpdateApplicationStatus } from '@/hooks/api/useApplicationsApi'
import { useShift } from '@/hooks/api/useShiftsApi'
import { useWalletBalance, useReserveFunds } from '@/hooks/api/usePaymentsApi'
import {
  InsufficientFundsModal,
  InsufficientFundsWarning,
  FundsReservedConfirmation,
} from '@/components/Payment'
import type { Application, ApplicationStatus } from '@/types/application'

export const Route = createFileRoute('/_layout/company/shifts/$shiftId/applicants')({
  component: ShiftApplicantsPage,
})

function ShiftApplicantsPage() {
  const { shiftId } = Route.useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  // API hooks
  const { data: applicantsData, isLoading: isLoadingApplicants, error: applicantsError } = useShiftApplicants(shiftId)
  const { data: shiftData, isLoading: isLoadingShift } = useShift(shiftId)
  const { data: walletData, isLoading: isLoadingWallet } = useWalletBalance()
  const updateStatus = useUpdateApplicationStatus()
  const reserveFunds = useReserveFunds()

  // Local state
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const applicants = applicantsData?.items ?? []
  const shift = shiftData
  const availableBalance = walletData?.available ?? 0
  const currency = walletData?.currency ?? 'EUR'

  // Calculate shift cost
  const calculateShiftCost = useCallback(() => {
    if (!shift) return 0
    const startTime = shift.start_time ? shift.start_time.split(':') : ['0', '0']
    const endTime = shift.end_time ? shift.end_time.split(':') : ['0', '0']
    const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1])
    const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1])
    let durationMinutes = endMinutes - startMinutes
    if (durationMinutes < 0) durationMinutes += 24 * 60 // Overnight shift
    const durationHours = durationMinutes / 60
    return shift.hourly_rate * durationHours
  }, [shift])

  const shiftCost = calculateShiftCost()
  const hasSufficientFunds = availableBalance >= shiftCost

  // Group applicants by status
  const groupedApplicants = useMemo(() => {
    return {
      pending: applicants.filter((a) => a.status === 'pending'),
      accepted: applicants.filter((a) => a.status === 'accepted'),
      rejected: applicants.filter((a) => a.status === 'rejected'),
      withdrawn: applicants.filter((a) => a.status === 'withdrawn'),
    }
  }, [applicants])

  // Handle accept click - show confirmation or insufficient funds modal
  const handleAcceptClick = (application: Application) => {
    setSelectedApplication(application)
    if (hasSufficientFunds) {
      setShowConfirmModal(true)
    } else {
      setShowInsufficientFundsModal(true)
    }
  }

  // Handle confirm acceptance
  // Note: This operation involves two sequential API calls (reserveFunds + updateStatus).
  // If updateStatus fails after reserveFunds succeeds, the funds remain reserved.
  // The backend should handle this gracefully by releasing funds if the application
  // status update fails, or ideally these should be combined into a single atomic API call.
  const handleConfirmAccept = async () => {
    if (!selectedApplication || !shift) return

    setIsProcessing(true)
    let fundsReserved = false

    try {
      // First, reserve the funds
      await reserveFunds.mutateAsync({
        shift_id: parseInt(shiftId),
        amount: shiftCost,
      })
      fundsReserved = true

      // Then, update the application status
      await updateStatus.mutateAsync({
        id: String(selectedApplication.id),
        status: 'accepted' as ApplicationStatus,
      })

      setShowConfirmModal(false)
      setShowSuccessModal(true)
    } catch (error) {
      // Check if it's an insufficient funds error (402)
      if (error instanceof Error && error.message.includes('402')) {
        setShowConfirmModal(false)
        setShowInsufficientFundsModal(true)
      } else {
        // If funds were reserved but status update failed, notify user
        // The backend should handle cleanup, but we inform the user of the partial failure
        if (fundsReserved) {
          addToast({
            type: 'error',
            title: 'Partial failure',
            description: 'Funds were reserved but application status update failed. Please contact support to resolve this issue.',
          })
        } else {
          addToast({
            type: 'error',
            title: 'Failed to accept applicant',
            description: 'Please try again or contact support.',
          })
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle reject
  const handleReject = async (applicationId: string) => {
    try {
      await updateStatus.mutateAsync({
        id: applicationId,
        status: 'rejected' as ApplicationStatus,
      })
      addToast({
        type: 'info',
        title: 'Applicant rejected',
        description: 'The worker has been notified.',
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to reject applicant',
        description: 'Please try again or contact support.',
      })
    }
  }

  // Handle top-up navigation
  const handleTopUp = () => {
    setShowInsufficientFundsModal(false)
    navigate({ to: '/wallet/top-up' })
  }

  // Handle success modal close
  const handleSuccessClose = () => {
    setShowSuccessModal(false)
    setSelectedApplication(null)
  }

  const isLoading = isLoadingApplicants || isLoadingShift || isLoadingWallet

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (applicantsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/company/shifts/${shiftId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Shift Applicants</h1>
        </div>
        <EmptyState
          icon={AlertCircle}
          title="Failed to load applicants"
          description="There was an error loading applicants. Please try again later."
        />
      </div>
    )
  }

  const renderApplicantCard = (application: Application, showActions = true) => {
    const applicant = application.applicant
    const initials = applicant?.full_name
      ? applicant.full_name.split(' ').map((n) => n[0]).join('')
      : '??'

    return (
      <div key={application.id} className="p-4 rounded-lg border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar size="lg" aria-label={`Avatar for ${applicant?.full_name || 'Unknown Applicant'}`}>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{applicant?.full_name || 'Unknown Applicant'}</p>
                {applicant?.is_verified && (
                  <Badge variant="success" className="text-xs">Verified</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>Applied {formatDate(application.applied_at)}</span>
              </div>
              {application.cover_message && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MessageSquare className="h-3 w-3" />
                    Cover Message
                  </div>
                  <p className="text-sm">{application.cover_message}</p>
                </div>
              )}
            </div>
          </div>
          {showActions && application.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => handleReject(String(application.id))}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-1 h-4 w-4" />
                )}
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => handleAcceptClick(application)}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                Accept
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/company/shifts/${shiftId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Shift Applicants</h1>
          <p className="text-muted-foreground">
            {applicants.length} total applicants {groupedApplicants.pending.length > 0 && `- ${groupedApplicants.pending.length} pending review`}
          </p>
        </div>
      </div>

      {/* Shift Cost Info Card */}
      {shift && (
        <Card className="border-brand-200 bg-brand-50/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-brand-100">
                  <Euro className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-medium">Shift Cost per Worker</p>
                  <p className="text-2xl font-bold text-brand-600">
                    {formatCurrency(shiftCost, currency)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{shift.hourly_rate && formatCurrency(shift.hourly_rate, currency)}/hr</span>
                <span className="text-muted-foreground">x</span>
                <span>{shift.duration_hours || Math.round((shiftCost / (shift.hourly_rate || 1)) * 10) / 10} hours</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Balance Warning */}
      {!hasSufficientFunds && groupedApplicants.pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Insufficient Balance</p>
                  <p className="text-sm text-amber-800">
                    Your available balance ({formatCurrency(availableBalance, currency)}) is not enough
                    to accept workers. Top up to continue.
                  </p>
                </div>
              </div>
              <Link to="/wallet/top-up">
                <Button size="sm">
                  <Wallet className="h-4 w-4 mr-2" />
                  Top Up Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Applicants */}
      {groupedApplicants.pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Review
              <Badge variant="warning">{groupedApplicants.pending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedApplicants.pending.map((application) => renderApplicantCard(application))}
          </CardContent>
        </Card>
      )}

      {/* Accepted Applicants */}
      {groupedApplicants.accepted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Accepted
              <Badge variant="success">{groupedApplicants.accepted.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedApplicants.accepted.map((application) => (
              <div key={application.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-3">
                  <Avatar aria-label={`Avatar for ${application.applicant?.full_name || 'Unknown'}`}>
                    <AvatarFallback>
                      {application.applicant?.full_name
                        ? application.applicant.full_name.split(' ').map((n) => n[0]).join('')
                        : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{application.applicant?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">Accepted {formatDate(application.applied_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                    <Clock className="h-3 w-3 mr-1" />
                    Payment Pending
                  </Badge>
                  <Badge variant="success">Assigned</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rejected Applicants */}
      {groupedApplicants.rejected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              Rejected
              <Badge variant="outline">{groupedApplicants.rejected.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedApplicants.rejected.map((application) => (
              <div key={application.id} className="flex items-center justify-between p-3 rounded-lg border opacity-60">
                <div className="flex items-center gap-3">
                  <Avatar aria-label={`Avatar for ${application.applicant?.full_name || 'Unknown'}`}>
                    <AvatarFallback>
                      {application.applicant?.full_name
                        ? application.applicant.full_name.split(' ').map((n) => n[0]).join('')
                        : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{application.applicant?.full_name || 'Unknown'}</p>
                </div>
                <Badge variant="outline">Rejected</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Withdrawn Applicants */}
      {groupedApplicants.withdrawn.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              Withdrawn
              <Badge variant="outline">{groupedApplicants.withdrawn.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedApplicants.withdrawn.map((application) => (
              <div key={application.id} className="flex items-center justify-between p-3 rounded-lg border opacity-60">
                <div className="flex items-center gap-3">
                  <Avatar aria-label={`Avatar for ${application.applicant?.full_name || 'Unknown'}`}>
                    <AvatarFallback>
                      {application.applicant?.full_name
                        ? application.applicant.full_name.split(' ').map((n) => n[0]).join('')
                        : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{application.applicant?.full_name || 'Unknown'}</p>
                </div>
                <Badge variant="outline">Withdrawn</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Applicants */}
      {applicants.length === 0 && (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          description="When workers apply for this shift, they'll appear here for your review."
        />
      )}

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Worker</DialogTitle>
            <DialogDescription>
              Confirm that you want to accept {selectedApplication?.applicant?.full_name} for this shift.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Shift Cost Summary */}
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Shift Cost</span>
                <span className="font-semibold">{formatCurrency(shiftCost, currency)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This amount will be deducted from your wallet when the shift is completed.
              </p>
            </div>

            {/* Funds Check */}
            <InsufficientFundsWarning
              currentBalance={availableBalance}
              requiredAmount={shiftCost}
              currency={currency}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAccept}
              disabled={isProcessing || !hasSufficientFunds}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Accept Worker
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insufficient Funds Modal */}
      <InsufficientFundsModal
        open={showInsufficientFundsModal}
        onOpenChange={setShowInsufficientFundsModal}
        currentBalance={availableBalance}
        requiredAmount={shiftCost}
        currency={currency}
        shiftTitle={shift?.title}
        onTopUp={handleTopUp}
      />

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <div className="py-4">
            <FundsReservedConfirmation
              amount={shiftCost}
              shiftTitle={shift?.title || 'this shift'}
              workerName={selectedApplication?.applicant?.full_name || 'Worker'}
              currency={currency}
              onClose={handleSuccessClose}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
