import { Link } from '@tanstack/react-router'
import { Calendar, Clock, Euro, Star, ArrowRight, Search, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

// Mock data - would come from API
const mockStats = {
  upcoming_shifts: 3,
  pending_applications: 5,
  total_earned: 2450,
  average_rating: 4.8,
  wallet_balance: 850,
}

const mockUpcomingShifts = [
  {
    id: '1',
    title: 'Bartender',
    company_name: 'The Brazen Head',
    date: '2026-02-07',
    start_time: '18:00',
    end_time: '00:00',
    hourly_rate: 18,
    status: 'confirmed',
  },
  {
    id: '2',
    title: 'Server',
    company_name: 'Restaurant XYZ',
    date: '2026-02-08',
    start_time: '12:00',
    end_time: '20:00',
    hourly_rate: 16,
    status: 'confirmed',
  },
]

const mockApplications = [
  {
    id: '1',
    shift_title: 'Line Cook',
    company_name: 'Hotel Dublin',
    date: '2026-02-10',
    status: 'pending',
    applied_at: '2026-02-04',
  },
  {
    id: '2',
    shift_title: 'Barista',
    company_name: 'Café Central',
    date: '2026-02-09',
    status: 'pending',
    applied_at: '2026-02-03',
  },
]

export function StaffDashboard() {
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
        <StatCard
          title="Upcoming Shifts"
          value={mockStats.upcoming_shifts}
          icon={Calendar}
        />
        <StatCard
          title="Pending Applications"
          value={mockStats.pending_applications}
          icon={Clock}
        />
        <StatCard
          title="Total Earned"
          value={formatCurrency(mockStats.total_earned)}
          subtitle="This month"
          icon={Euro}
        />
        <StatCard
          title="Wallet Balance"
          value={formatCurrency(mockStats.wallet_balance)}
          icon={Wallet}
        />
        <StatCard
          title="Rating"
          value={mockStats.average_rating.toFixed(1)}
          icon={Star}
        />
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
            {mockUpcomingShifts.length > 0 ? (
              <div className="space-y-4">
                {mockUpcomingShifts.map((shift) => (
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
                        {shift.company_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(shift.date)} • {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
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
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>No upcoming shifts</p>
                <Link to="/marketplace">
                  <Button variant="link" className="mt-2">
                    Browse available shifts
                  </Button>
                </Link>
              </div>
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
            {mockApplications.length > 0 ? (
              <div className="space-y-4">
                {mockApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{app.shift_title}</p>
                        <Badge variant="warning">Pending</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {app.company_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(app.date)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Applied {formatDate(app.applied_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>No pending applications</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
