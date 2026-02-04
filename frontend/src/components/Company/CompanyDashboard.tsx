import { Link } from '@tanstack/react-router'
import { Calendar, Users, Euro, Star, ArrowRight, Plus, AlertCircle, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

// Mock data - would come from API
const mockStats = {
  active_shifts: 5,
  pending_applications: 12,
  total_spent: 2850,
  average_rating: 4.8,
  wallet_balance: 1500,
}

const mockShiftsNeedingAttention = [
  {
    id: '1',
    title: 'Bartender',
    date: '2026-02-07',
    start_time: '18:00',
    applicants: 3,
    spots_filled: 0,
    spots_total: 1,
  },
  {
    id: '2',
    title: 'Server',
    date: '2026-02-08',
    start_time: '12:00',
    applicants: 0,
    spots_filled: 0,
    spots_total: 2,
  },
]

const mockUpcomingShifts = [
  {
    id: '3',
    title: 'Bartender',
    date: '2026-02-06',
    start_time: '18:00',
    worker_name: 'John D.',
    spots_filled: 1,
    spots_total: 1,
    status: 'filled',
  },
  {
    id: '4',
    title: 'Server',
    date: '2026-02-07',
    start_time: '12:00',
    worker_name: null,
    spots_filled: 1,
    spots_total: 2,
    status: 'partial',
  },
]

export function CompanyDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your shifts and workers.</p>
        </div>
        <Link to="/company/shifts/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Post Shift
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Active Shifts"
          value={mockStats.active_shifts}
          icon={Calendar}
        />
        <StatCard
          title="Pending Applications"
          value={mockStats.pending_applications}
          icon={Users}
        />
        <StatCard
          title="Spent This Month"
          value={formatCurrency(mockStats.total_spent)}
          icon={Euro}
        />
        <StatCard
          title="Wallet Balance"
          value={formatCurrency(mockStats.wallet_balance)}
          icon={Wallet}
        />
        <StatCard
          title="Company Rating"
          value={mockStats.average_rating.toFixed(1)}
          icon={Star}
        />
      </div>

      {/* Shifts Needing Attention */}
      {mockShiftsNeedingAttention.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              Shifts Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockShiftsNeedingAttention.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg bg-white border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{shift.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(shift.date)} at {formatTime(shift.start_time)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {shift.applicants > 0 ? (
                      <Badge variant="default">{shift.applicants} applicants</Badge>
                    ) : (
                      <Badge variant="outline">No applicants</Badge>
                    )}
                    <Link to={`/company/shifts/${shift.id}/applicants`}>
                      <Button size="sm" variant={shift.applicants > 0 ? 'default' : 'outline'}>
                        {shift.applicants > 0 ? 'Review' : 'Edit'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Shifts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Shifts</CardTitle>
          <Link to="/company/shifts" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {mockUpcomingShifts.length > 0 ? (
            <div className="space-y-4">
              {mockUpcomingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(shift.date).split(',')[0]}
                      </p>
                      <p className="font-semibold">{formatTime(shift.start_time)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{shift.title}</p>
                      {shift.worker_name ? (
                        <p className="text-sm text-muted-foreground">
                          {shift.worker_name}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {shift.spots_filled}/{shift.spots_total} filled
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={shift.status === 'filled' ? 'success' : 'warning'}
                  >
                    {shift.status === 'filled' ? 'Filled' : `${shift.spots_total - shift.spots_filled} Pending`}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No upcoming shifts</p>
              <Link to="/company/shifts/create">
                <Button variant="link" className="mt-2">
                  Post your first shift
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
