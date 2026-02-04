import { Link } from '@tanstack/react-router'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatCurrency, formatTime } from '@/lib/utils'

// Mock data - would come from API
const mockStats = {
  total_staff: 45,
  available_staff: 38,
  total_clients: 12,
  pending_clients: 3,
  active_shifts: 28,
  revenue_this_week: 8500,
}

const mockTodaySchedule = [
  {
    id: '1',
    time: '06:00',
    title: 'Kitchen Porter',
    client: 'Hotel ABC',
    worker: 'John D.',
    status: 'confirmed',
  },
  {
    id: '2',
    time: '09:00',
    title: 'Server',
    client: 'Café Central',
    spots_total: 3,
    spots_filled: 2,
    status: 'partial',
  },
  {
    id: '3',
    time: '18:00',
    title: 'Bartender',
    client: 'The Local',
    workers: ['Maria', 'Tom'],
    status: 'confirmed',
  },
]

const mockAvailableStaff = [
  { id: '1', name: 'John', avatar: null, available: true },
  { id: '2', name: 'Maria', avatar: null, available: true },
  { id: '3', name: 'Tom', avatar: null, available: true },
  { id: '4', name: 'Sarah', avatar: null, available: false },
  { id: '5', name: 'Ali', avatar: null, available: true },
]

const mockUnfilledShifts = [
  {
    id: '1',
    title: 'Server',
    client: 'Café Central',
    date: 'Tomorrow 9AM',
    spots_needed: 1,
  },
  {
    id: '2',
    title: 'Kitchen',
    client: 'Hotel ABC',
    date: 'Sat',
    spots_needed: 3,
  },
]

const mockPendingActions = [
  { type: 'staff_applications', count: 3, label: 'new staff applications' },
  { type: 'invoices', count: 2, label: 'client invoices due' },
  { type: 'timesheets', count: 5, label: 'timesheets to approve' },
]

export function AgencyDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <StatCard
          title="Staff"
          value={mockStats.total_staff}
          subtitle={`${mockStats.available_staff} available`}
          icon={Users}
        />
        <StatCard
          title="Clients"
          value={mockStats.total_clients}
          subtitle={`${mockStats.pending_clients} pending`}
          icon={Building2}
        />
        <StatCard
          title="Active Shifts"
          value={mockStats.active_shifts}
          icon={Calendar}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(mockStats.revenue_this_week)}
          subtitle="This week"
          icon={Euro}
        />
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
            <div className="space-y-3">
              {mockTodaySchedule.map((shift) => (
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
                          {shift.worker || (shift.workers && shift.workers.join(', '))}
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
            <div className="flex flex-wrap gap-2">
              {mockAvailableStaff.map((staff) => (
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
                  <span className="text-xs text-muted-foreground">{staff.name}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
                  +12
                </div>
                <span className="text-xs text-muted-foreground">more</span>
              </div>
            </div>
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
            <div className="space-y-3">
              {mockUnfilledShifts.map((shift) => (
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
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockPendingActions.map((action) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
