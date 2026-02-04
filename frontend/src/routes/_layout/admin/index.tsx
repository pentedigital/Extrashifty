import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import {
  Users, Building2, Briefcase, Calendar, TrendingUp,
  AlertCircle, DollarSign, Clock
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_layout/admin/')({
  component: AdminDashboard,
})

const mockStats = {
  totalUsers: 5247,
  activeUsers: 4832,
  totalCompanies: 523,
  totalAgencies: 47,
  activeShifts: 342,
  shiftsThisWeek: 1247,
  totalRevenue: 48520,
  pendingPayouts: 12340,
}

const mockRecentActivity = [
  { id: '1', type: 'user_signup', message: 'New user registered: john.doe@email.com', time: '2 min ago', icon: Users },
  { id: '2', type: 'shift_created', message: 'The Brazen Head posted a new shift', time: '5 min ago', icon: Calendar },
  { id: '3', type: 'payout', message: 'Payout processed: €1,240 to Dublin Staffing', time: '12 min ago', icon: DollarSign },
  { id: '4', type: 'verification', message: 'ID verification completed: Maria Santos', time: '18 min ago', icon: Users },
  { id: '5', type: 'dispute', message: 'New dispute raised: Shift #4521', time: '25 min ago', icon: AlertCircle },
]

const mockPendingActions = [
  { id: '1', type: 'verification', count: 12, label: 'ID verifications pending' },
  { id: '2', type: 'dispute', count: 3, label: 'Open disputes' },
  { id: '3', type: 'payout', count: 8, label: 'Payouts to process' },
  { id: '4', type: 'company', count: 5, label: 'Company approvals' },
]

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Total Users"
          value={mockStats.totalUsers.toLocaleString()}
          subtitle={`${mockStats.activeUsers.toLocaleString()} active`}
          icon={Users}
        />
        <StatCard
          title="Companies"
          value={mockStats.totalCompanies.toLocaleString()}
          icon={Building2}
        />
        <StatCard
          title="Agencies"
          value={mockStats.totalAgencies.toLocaleString()}
          icon={Briefcase}
        />
        <StatCard
          title="Active Shifts"
          value={mockStats.activeShifts.toLocaleString()}
          subtitle={`${mockStats.shiftsThisWeek} this week`}
          icon={Calendar}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Revenue This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(mockStats.totalRevenue)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {formatCurrency(mockStats.pendingPayouts)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              8 payouts awaiting processing
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockPendingActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <span className="text-sm">{action.label}</span>
                  <Badge variant={action.count > 5 ? 'destructive' : 'warning'}>
                    {action.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <activity.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
