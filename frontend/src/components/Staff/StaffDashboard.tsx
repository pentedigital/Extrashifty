import { Link } from '@tanstack/react-router'
import { Calendar, Clock, Euro, Star, ArrowRight, Search, Wallet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useMyShifts, useMyStats } from '@/hooks/api/useStaffApi'
import { useMyApplications } from '@/hooks/api/useApplicationsApi'

// Helper to get badge variant for application status
function getApplicationBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'accepted':
      return 'success'
    case 'pending':
      return 'warning'
    case 'rejected':
    case 'withdrawn':
      return 'destructive'
    default:
      return 'default'
  }
}

// Helper to format application status label
function formatApplicationStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function StaffDashboard() {
  // Fetch data using React Query hooks
  const { data: stats, isLoading: statsLoading, error: statsError } = useMyStats()
  const { data: upcomingShifts, isLoading: shiftsLoading, error: shiftsError } = useMyShifts()
  const { data: applicationsData, isLoading: applicationsLoading, error: applicationsError } = useMyApplications('pending')

  // Extract applications from the response (backend returns { items, total })
  const applications = applicationsData?.items ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/marketplace">
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Find Shifts
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {statsLoading ? (
          <>
            <StatCard title="Upcoming Shifts" value="-" icon={Calendar} />
            <StatCard title="Pending Applications" value="-" icon={Clock} />
            <StatCard title="Total Earned" value="-" subtitle="This month" icon={Euro} />
            <StatCard title="Wallet Balance" value="-" icon={Wallet} />
            <StatCard title="Rating" value="-" icon={Star} />
          </>
        ) : statsError ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center gap-2 py-4 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load stats. Please try again.</span>
            </CardContent>
          </Card>
        ) : (
          <>
            <StatCard
              title="Upcoming Shifts"
              value={stats?.upcoming_shifts ?? 0}
              icon={Calendar}
            />
            <StatCard
              title="Pending Applications"
              value={stats?.pending_applications ?? 0}
              icon={Clock}
            />
            <StatCard
              title="Total Earned"
              value={formatCurrency(stats?.total_earned ?? 0)}
              subtitle="This month"
              icon={Euro}
            />
            <StatCard
              title="Wallet Balance"
              value={formatCurrency(stats?.wallet_balance ?? 0)}
              icon={Wallet}
            />
            <StatCard
              title="Rating"
              value={stats?.average_rating ? stats.average_rating.toFixed(1) : 'N/A'}
              icon={Star}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Shifts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Shifts</CardTitle>
            <Link to="/shifts" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {shiftsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : shiftsError ? (
              <div className="flex items-center gap-2 py-8 justify-center text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load shifts</span>
              </div>
            ) : upcomingShifts && upcomingShifts.length > 0 ? (
              <div className="space-y-4">
                {upcomingShifts.slice(0, 5).map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{shift.title}</p>
                        <Badge variant="success">Confirmed</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {shift.company?.full_name ?? shift.location ?? shift.city ?? 'Unknown venue'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(shift.date)} {shift.start_time && shift.end_time && (
                          <>
                            {' '} {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-brand-600">
                        {formatCurrency(shift.hourly_rate)}/hr
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No upcoming shifts"
                description="You don't have any confirmed shifts yet."
                action={
                  <Link to="/marketplace">
                    <Button variant="outline">Browse available shifts</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Applications</CardTitle>
            <Link to="/shifts/applications" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {applicationsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : applicationsError ? (
              <div className="flex items-center gap-2 py-8 justify-center text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load applications</span>
              </div>
            ) : applications.length > 0 ? (
              <div className="space-y-4">
                {applications.slice(0, 5).map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{app.shift?.title ?? 'Shift'}</p>
                        <Badge variant={getApplicationBadgeVariant(app.status)}>
                          {formatApplicationStatus(app.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {app.shift?.company?.full_name ?? app.shift?.location ?? app.shift?.city ?? 'Unknown venue'}
                      </p>
                      {app.shift?.date && (
                        <p className="text-sm text-muted-foreground">
                          {formatDate(app.shift.date)}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Applied {formatDate(app.applied_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No pending applications"
                description="Apply to shifts and track your applications here."
                action={
                  <Link to="/marketplace">
                    <Button variant="outline">Browse shifts</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
