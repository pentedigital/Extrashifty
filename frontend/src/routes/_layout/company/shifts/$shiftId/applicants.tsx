import { useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowLeft, Check, X, Star, Calendar, MessageSquare, AlertCircle, Loader2, Users } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { useShiftApplicants, useUpdateApplicationStatus } from '@/hooks/api/useApplicationsApi'
import type { Application, ApplicationStatus } from '@/types/application'

export const Route = createFileRoute('/_layout/company/shifts/$shiftId/applicants')({
  component: ShiftApplicantsPage,
})

function ShiftApplicantsPage() {
  const { shiftId } = Route.useParams()
  const { addToast } = useToast()

  // Fetch applicants for this shift
  const { data, isLoading, error } = useShiftApplicants(shiftId)
  const updateStatus = useUpdateApplicationStatus()

  const applicants = data?.items ?? []

  // Group applicants by status
  const groupedApplicants = useMemo(() => {
    return {
      pending: applicants.filter((a) => a.status === 'pending'),
      accepted: applicants.filter((a) => a.status === 'accepted'),
      rejected: applicants.filter((a) => a.status === 'rejected'),
      withdrawn: applicants.filter((a) => a.status === 'withdrawn'),
    }
  }, [applicants])

  const handleAccept = async (applicationId: string) => {
    try {
      await updateStatus.mutateAsync({
        id: applicationId,
        status: 'accepted' as ApplicationStatus,
      })
      addToast({
        type: 'success',
        title: 'Applicant accepted',
        description: 'The worker has been notified and assigned to this shift.',
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to accept applicant',
        description: 'Please try again or contact support.',
      })
    }
  }

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
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
            <Avatar size="lg">
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
                onClick={() => handleAccept(String(application.id))}
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
                  <Avatar>
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
                <Badge variant="success">Assigned</Badge>
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
                  <Avatar>
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
                  <Avatar>
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

      {applicants.length === 0 && (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          description="When workers apply for this shift, they'll appear here for your review."
        />
      )}
    </div>
  )
}
