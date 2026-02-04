import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { FileText, Search, Loader2, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useApplications, useUpdateApplicationStatus } from '@/hooks/api'
import type { Application, ApplicationStatus } from '@/types/application'

export const Route = createFileRoute('/_layout/shifts/applications')({
  component: ApplicationsPage,
})

function ApplicationsPage() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('pending')
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  // Fetch applications
  const { data, isLoading, error } = useApplications()
  const updateStatus = useUpdateApplicationStatus()

  // Group applications by status
  const applicationsByStatus = useMemo(() => {
    const apps = data?.items ?? []
    return {
      pending: apps.filter(a => a.status === 'pending'),
      accepted: apps.filter(a => a.status === 'accepted'),
      rejected: apps.filter(a => a.status === 'rejected'),
      withdrawn: apps.filter(a => a.status === 'withdrawn'),
    }
  }, [data])

  const handleWithdraw = async () => {
    if (!selectedApplication) return

    try {
      await updateStatus.mutateAsync({
        id: selectedApplication.id,
        status: 'withdrawn',
      })
      addToast({
        type: 'success',
        title: 'Application withdrawn',
        description: `Your application for "${selectedApplication.shift?.title}" has been withdrawn.`,
      })
      setWithdrawDialogOpen(false)
      setSelectedApplication(null)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to withdraw',
        description: 'Please try again or contact support.',
      })
    }
  }

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'withdrawn':
        return <Badge variant="secondary">Withdrawn</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const renderApplicationList = (applications: Application[]) => {
    if (applications.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="No applications"
          description={
            activeTab === 'pending'
              ? "You haven't applied to any shifts yet. Browse the marketplace to find work."
              : `No ${activeTab} applications.`
          }
          action={
            activeTab === 'pending' ? (
              <Link to="/marketplace">
                <Button>
                  <Search className="mr-2 h-4 w-4" />
                  Find Shifts
                </Button>
              </Link>
            ) : undefined
          }
        />
      )
    }

    return (
      <div className="space-y-3">
        {applications.map((app) => (
          <Card key={app.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{app.shift?.title || 'Shift'}</p>
                    {getStatusBadge(app.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @ {app.shift?.company?.company_name || app.shift?.location_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {app.shift?.date && formatDate(app.shift.date)} • {app.shift?.hourly_rate && formatCurrency(app.shift.hourly_rate)}/hr
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Applied {formatDate(app.applied_at)}
                  </p>
                  {app.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApplication(app)
                        setWithdrawDialogOpen(true)
                      }}
                    >
                      Withdraw
                    </Button>
                  )}
                  {app.status === 'accepted' && (
                    <Link to="/shifts">
                      <Button size="sm">View Shift</Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Failed to load applications"
        description="There was an error loading your applications. Please try again."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Applications</h1>
          <p className="text-muted-foreground">Track your shift applications</p>
        </div>
        <Link to="/marketplace">
          <Button>
            <Search className="mr-2 h-4 w-4" />
            Find Shifts
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ApplicationStatus | 'all')}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({applicationsByStatus.pending.length})
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Accepted ({applicationsByStatus.accepted.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({applicationsByStatus.rejected.length})
            </TabsTrigger>
            <TabsTrigger value="withdrawn">
              Withdrawn ({applicationsByStatus.withdrawn.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {renderApplicationList(applicationsByStatus.pending)}
          </TabsContent>
          <TabsContent value="accepted" className="mt-6">
            {renderApplicationList(applicationsByStatus.accepted)}
          </TabsContent>
          <TabsContent value="rejected" className="mt-6">
            {renderApplicationList(applicationsByStatus.rejected)}
          </TabsContent>
          <TabsContent value="withdrawn" className="mt-6">
            {renderApplicationList(applicationsByStatus.withdrawn)}
          </TabsContent>
        </Tabs>
      )}

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw your application for{' '}
              <span className="font-medium text-foreground">
                {selectedApplication?.shift?.title}
              </span>{' '}
              at {selectedApplication?.shift?.company?.company_name}?
              <br /><br />
              You can re-apply later if the position is still available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Application</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleWithdraw}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
