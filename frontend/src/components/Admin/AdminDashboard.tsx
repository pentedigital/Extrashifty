import { Link } from '@tanstack/react-router'
import {
  Users,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  Wallet,
  Activity,
  BarChart3,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency } from '@/lib/utils'
import { useAdminStats } from '@/hooks/api/useAdminApi'

interface QuickLinkProps {
  to: string
  icon: React.ElementType
  label: string
  count?: number
}

function QuickLink({ to, icon: Icon, label, count }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-50 rounded-lg">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && count > 0 && (
          <Badge variant="secondary">{count}</Badge>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}

export function AdminDashboard() {
  const { data, isLoading, error } = useAdminStats()
  const stats = data?.stats

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Dashboard" description="System overview and management" />
        <div className="dashboard-stats-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Dashboard" description="System overview and management" />
        <Card>
          <CardContent className="flex items-center gap-2 py-4 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load dashboard data. Please try again.</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Admin Dashboard"
        description="System overview and management"
      />

      {/* Key Stats */}
      <div className="dashboard-stats-grid">
        <StatCard
          title="Total Users"
          value={(stats?.totalUsers ?? 0).toLocaleString()}
          subtitle={`${(stats?.activeUsers ?? 0).toLocaleString()} active`}
          icon={Users}
          iconColor="brand"
        />
        <StatCard
          title="Companies"
          value={(stats?.totalCompanies ?? 0).toLocaleString()}
          icon={Building2}
          iconColor="info"
        />
        <StatCard
          title="Agencies"
          value={stats?.totalAgencies ?? 0}
          icon={Briefcase}
          iconColor="brand"
        />
        <StatCard
          title="Active Shifts"
          value={stats?.activeShifts ?? 0}
          subtitle={`${stats?.shiftsThisWeek ?? 0} this week`}
          icon={Activity}
          iconColor="success"
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          subtitle="This month"
          icon={BarChart3}
          iconColor="success"
        />
      </div>

      {/* Payout Alert */}
      {(stats?.pendingPayouts ?? 0) > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">
                  {stats.pendingPayouts} pending payout{stats.pendingPayouts !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-muted-foreground">Awaiting processing</p>
              </div>
            </div>
            <Link to="/admin/payouts">
              <Badge variant="warning">Review</Badge>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="dashboard-content-grid">
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickLink
              to="/admin/users"
              icon={Users}
              label="Manage Users"
            />
            <QuickLink
              to="/admin/companies"
              icon={Building2}
              label="Manage Companies"
            />
            <QuickLink
              to="/admin/agencies"
              icon={Briefcase}
              label="Manage Agencies"
            />
            <QuickLink
              to="/admin/shifts"
              icon={Calendar}
              label="Manage Shifts"
            />
            <QuickLink
              to="/admin/transactions"
              icon={CreditCard}
              label="View Transactions"
            />
            <QuickLink
              to="/admin/payouts"
              icon={Wallet}
              label="Process Payouts"
              count={stats?.pendingPayouts}
            />
          </CardContent>
        </Card>

        {/* Reports Link */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Platform Reports</CardTitle>
            <Link
              to="/admin/reports"
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View reports <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-50 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Revenue Reports</p>
                    <p className="text-xs text-muted-foreground">Monthly and weekly breakdowns</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-50 rounded-lg">
                    <Users className="h-4 w-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">User Growth</p>
                    <p className="text-xs text-muted-foreground">Sign-ups and active users</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Shift Analytics</p>
                    <p className="text-xs text-muted-foreground">Fill rates and completion metrics</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
