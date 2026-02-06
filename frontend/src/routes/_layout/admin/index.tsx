import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import {
  Users, Building2, Briefcase, Calendar, TrendingUp,
  AlertCircle, DollarSign, Clock, Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAdminStats } from '@/hooks/api/useAdminApi'

export const Route = createFileRoute('/_layout/admin/')({
  component: AdminDashboard,
})

// Icon mapping for activity types
const activityIcons: Record<string, typeof Users> = {
  user_signup: Users,
  shift_created: Calendar,
  payout: DollarSign,
  verification: Users,
  dispute: AlertCircle,
}

function AdminDashboard() {
  const { data, isLoading, error } = useAdminStats()

  // Use API data or fallback to defaults
  const stats = data?.stats || {
    totalUsers: 0,
    activeUsers: 0,
    totalCompanies: 0,
    totalAgencies: 0,
    activeShifts: 0,
    shiftsThisWeek: 0,
    totalRevenue: 0,
    pendingPayouts: 0,
  }

  const pendingActions = data?.pendingActions || []
  const recentActivity = data?.recentActivity || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Unable to load dashboard data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          subtitle={`${stats.activeUsers.toLocaleString()} active`}
          icon={Users}
        />
        <StatCard
          title="Companies"
          value={stats.totalCompanies.toLocaleString()}
          icon={Building2}
        />
        <StatCard
          title="Agencies"
          value={stats.totalAgencies.toLocaleString()}
          icon={Briefcase}
        />
        <StatCard
          title="Active Shifts"
          value={stats.activeShifts.toLocaleString()}
          subtitle={`${stats.shiftsThisWeek} this week`}
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
              {formatCurrency(stats.totalRevenue)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Platform revenue
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
              {formatCurrency(stats.pendingPayouts)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Awaiting processing
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
            {pendingActions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending actions
              </p>
            ) : (
              <div className="space-y-3">
                {pendingActions.map((action) => (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const IconComponent = activityIcons[activity.type] || AlertCircle
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
