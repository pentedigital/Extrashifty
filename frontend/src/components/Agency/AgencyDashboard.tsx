import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import {
  Users,
  Building2,
  Calendar,
  Euro,
  ArrowRight,
  Plus,
  AlertCircle,
  Check,
  UserPlus,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatCurrency, formatTime, formatDate } from '@/lib/utils'
import { useAgencyStats, useAgencyStaff, useAgencyShifts } from '@/hooks/api/useAgencyApi'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

// Default stats for loading state or fallback
const defaultStats = {
  total_staff: 0,
  available_staff: 0,
  total_clients: 0,
  pending_clients: 0,
  active_shifts: 0,
  revenue_this_week: 0,
  pending_invoices: 0,
  pending_payroll: 0,
}

export function AgencyDashboard() {
  // Fetch real stats from API
  const { data: stats, isLoading: statsLoading, error: statsError } = useAgencyStats()
  const { data: staffData, isLoading: staffLoading } = useAgencyStaff({ status: 'active', limit: '10' })
  const { data: shiftsData, isLoading: shiftsLoading } = useAgencyShifts({ status: 'open' })

  // Process shifts data for today's schedule and unfilled shifts
  const todaySchedule = useMemo(() => {
    if (!shiftsData) return []
    const today = new Date().toISOString().split('T')[0]
    const shiftsArray = Array.isArray(shiftsData) ? shiftsData : []
    return shiftsArray
      .filter((shift) => shift.date === today)
      .slice(0, 5)
      .map((shift) => ({
        id: String(shift.id),
        time: shift.start_time,
        title: shift.title,
        client: shift.client?.business_name ?? 'Unknown Client',
        spots_total: shift.spots_total ?? 1,
        spots_filled: shift.spots_filled ?? 0,
        status: shift.spots_filled === shift.spots_total ? 'confirmed' : 'partial',
        workers: shift.assigned_staff?.map((s) => s.staff?.full_name ?? 'Staff').slice(0, 2) ?? [],
      }))
  }, [shiftsData])

  const unfilledShifts = useMemo(() => {
    if (!shiftsData) return []
    const shiftsArray = Array.isArray(shiftsData) ? shiftsData : []
    return shiftsArray
      .filter((shift) => (shift.spots_filled ?? 0) < (shift.spots_total ?? 1))
      .slice(0, 5)
      .map((shift) => ({
        id: String(shift.id),
        title: shift.title,
        client: shift.client?.business_name ?? 'Unknown Client',
        date: formatDate(shift.date),
        spots_needed: (shift.spots_total ?? 1) - (shift.spots_filled ?? 0),
      }))
  }, [shiftsData])

  // Use API data or fallback to defaults
  const displayStats = stats ?? defaultStats

  // Build staff availability from API data
  const availableStaffList = (staffData?.items ?? []).slice(0, 5).map((member) => ({
    id: member.id,
    name: member.staff?.full_name ?? `Staff ${member.staff_id}`,
    avatar: member.staff?.avatar_url ?? null,
    available: member.is_available,
  }))

  // Calculate remaining staff count for "+N more" display
  const remainingStaff = Math.max(0, (staffData?.total ?? 0) - 5)

  // Dynamic pending actions based on stats
  const pendingActions = [
    { type: 'staff_applications', count: displayStats.pending_clients, label: 'pending staff invitations' },
    { type: 'invoices', count: displayStats.pending_invoices, label: 'client invoices due' },
    { type: 'timesheets', count: displayStats.pending_payroll, label: 'timesheets to approve' },
  ].filter(action => action.count > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agency Dashboard</h1>
          <p className="text-muted-foreground">Manage your staff, clients, and shifts.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/agency/staff/invite">
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </Link>
          <Link to="/agency/shifts/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Shift
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </>
        ) : statsError ? (
          <div className="col-span-4 text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load stats. Please try again.</p>
          </div>
        ) : (
          <>
            <StatCard
              title="Staff"
              value={displayStats.total_staff}
              subtitle={`${displayStats.available_staff} available`}
              icon={Users}
            />
            <StatCard
              title="Clients"
              value={displayStats.total_clients}
              subtitle={displayStats.pending_clients > 0 ? `${displayStats.pending_clients} pending` : undefined}
              icon={Building2}
            />
            <StatCard
              title="Active Shifts"
              value={displayStats.active_shifts}
              icon={Calendar}
            />
            <StatCard
              title="Revenue"
              value={formatCurrency(displayStats.revenue_this_week)}
              subtitle="This week"
              icon={Euro}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today's Schedule</CardTitle>
            <Link to="/agency/schedule" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
              Full Calendar <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {shiftsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : todaySchedule.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No shifts today"
                description="You don't have any shifts scheduled for today."
              />
            ) : (
              <div className="space-y-3">
                {todaySchedule.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center gap-4 rounded-lg border p-3"
                  >
                    <div className="text-center min-w-[50px]">
                      <p className="font-semibold">{formatTime(shift.time)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {shift.title}
                        {shift.spots_total && shift.spots_total > 1 && ` x${shift.spots_total}`}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {shift.client}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {shift.status === 'confirmed' ? (
                        <>
                          <span className="text-sm text-muted-foreground">
                            {shift.workers.join(', ') || 'Assigned'}
                          </span>
                          <Check className="h-4 w-4 text-green-600" />
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-yellow-600">
                            {shift.spots_filled}/{shift.spots_total} assigned
                          </span>
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Availability */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Staff Availability</CardTitle>
            <Link to="/agency/staff" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {staffLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableStaffList.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No staff members yet</p>
                <Link to="/agency/staff/invite">
                  <Button variant="outline" size="sm" className="mt-2">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Staff
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableStaffList.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex flex-col items-center gap-1"
                    title={staff.available ? 'Available' : 'Busy'}
                  >
                    <div className="relative">
                      <Avatar size="md">
                        {staff.avatar && <AvatarImage src={staff.avatar} />}
                        <AvatarFallback>{staff.name[0]}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          staff.available ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{staff.name.split(' ')[0]}</span>
                  </div>
                ))}
                {remainingStaff > 0 && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
                      +{remainingStaff}
                    </div>
                    <span className="text-xs text-muted-foreground">more</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Unfilled Shifts */}
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              Unfilled Shifts
            </CardTitle>
            <Link to="/agency/shifts" className="text-sm text-yellow-700 hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {shiftsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : unfilledShifts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">All shifts are fully staffed!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unfilledShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between rounded-lg bg-white border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {shift.title} @ {shift.client}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {shift.date} - Need {shift.spots_needed} more
                      </p>
                    </div>
                    <Link to={`/agency/shifts/${shift.id}/assign`}>
                      <Button size="sm">Assign Staff</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : pendingActions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">All caught up! No pending actions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div
                    key={action.type}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
                        {action.count}
                      </div>
                      <span className="text-sm">{action.label}</span>
                    </div>
                    <Link
                      to={
                        action.type === 'staff_applications'
                          ? '/agency/staff'
                          : action.type === 'invoices'
                          ? '/agency/billing/invoices'
                          : '/agency/billing/payroll'
                      }
                    >
                      <Button size="sm" variant="ghost">
                        {action.type === 'timesheets' ? 'Approve' : 'Review'}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
