import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { FileText, Search, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
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

export const Route = createFileRoute('/_layout/shifts/applications')({
  component: ApplicationsPage,
})

// Mock data
const mockApplications = {
  pending: [
    {
      id: '1',
      shift_title: 'Line Cook',
      business_name: 'Hotel Dublin',
      date: '2026-02-10',
      hourly_rate: 20,
      applied_at: '2026-02-04',
      status: 'pending',
    },
    {
      id: '2',
      shift_title: 'Barista',
      business_name: 'Café Central',
      date: '2026-02-09',
      hourly_rate: 14,
      applied_at: '2026-02-03',
      status: 'pending',
    },
  ],
  accepted: [
    {
      id: '3',
      shift_title: 'Bartender',
      business_name: 'The Brazen Head',
      date: '2026-02-07',
      hourly_rate: 18,
      applied_at: '2026-02-01',
      status: 'accepted',
    },
  ],
  rejected: [
    {
      id: '4',
      shift_title: 'Server',
      business_name: 'Fine Dining XYZ',
      date: '2026-02-06',
      hourly_rate: 22,
      applied_at: '2026-01-30',
      status: 'rejected',
    },
  ],
  withdrawn: [],
}

interface Application {
  id: string
  shift_title: string
  business_name: string
  date: string
  hourly_rate: number
  applied_at: string
  status: string
}

function ApplicationsPage() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('pending')
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [applications, setApplications] = useState(mockApplications)

  const handleWithdraw = async () => {
    if (!selectedApplication) return

    setIsWithdrawing(true)
    try {
      // TODO: Call API to withdraw application
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update local state
      setApplications(prev => ({
        ...prev,
        pending: prev.pending.filter(app => app.id !== selectedApplication.id),
        withdrawn: [...prev.withdrawn, { ...selectedApplication, status: 'withdrawn' }],
      }))
      addToast({
        type: 'success',
        title: 'Application withdrawn',
        description: `Your application for "${selectedApplication.shift_title}" has been withdrawn.`,
      })
      setWithdrawDialogOpen(false)
      setSelectedApplication(null)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to withdraw',
        description: 'Please try again or contact support.',
      })
    } finally {
      setIsWithdrawing(false)
    }
  }

  const getStatusBadge = (status: string) => {
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

  const renderApplicationList = (applications: typeof mockApplications.pending) => {
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
                    <p className="font-medium">{app.shift_title}</p>
                    {getStatusBadge(app.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @ {app.business_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(app.date)} • {formatCurrency(app.hourly_rate)}/hr
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({applications.pending.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({applications.accepted.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({applications.rejected.length})
          </TabsTrigger>
          <TabsTrigger value="withdrawn">
            Withdrawn ({applications.withdrawn.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {renderApplicationList(applications.pending)}
        </TabsContent>
        <TabsContent value="accepted" className="mt-6">
          {renderApplicationList(applications.accepted)}
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          {renderApplicationList(applications.rejected)}
        </TabsContent>
        <TabsContent value="withdrawn" className="mt-6">
          {renderApplicationList(applications.withdrawn)}
        </TabsContent>
      </Tabs>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw your application for{' '}
              <span className="font-medium text-foreground">
                {selectedApplication?.shift_title}
              </span>{' '}
              at {selectedApplication?.business_name}?
              <br /><br />
              You can re-apply later if the position is still available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Application</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
