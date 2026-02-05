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
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

// Mock data for admin dashboard
const mockSystemStats = {
  total_users: 1247,
  total_companies: 89,
  total_agencies: 23,
  total_shifts: 3456,
  pending_applications: 127,
  active_shifts: 42,
  total_transactions: 8923,
  pending_payouts: 34,
  platform_revenue: 45230,
  revenue_change: 12.5,
}

const mockRecentActivity = [
  {
    id: '1',
    type: 'user_registered',
    description: 'New staff member registered',
    user: 'John Murphy',
    timestamp: '2026-02-05T14:30:00Z',
  },
  {
    id: '2',
    type: 'company_registered',
    description: 'New company registered',
    user: 'Dublin Dining Co.',
    timestamp: '2026-02-05T13:45:00Z',
  },
  {
    id: '3',
    type: 'shift_created',
    description: 'New shift posted',
    user: 'The Brazen Head',
    timestamp: '2026-02-05T12:15:00Z',
  },
  {
    id: '4',
    type: 'payout_requested',
    description: 'Payout requested',
    user: 'Sarah O\'Brien',
    amount: 450,
    timestamp: '2026-02-05T11:30:00Z',
  },
  {
    id: '5',
    type: 'shift_completed',
    description: 'Shift completed',
    user: 'Restaurant XYZ',
    timestamp: '2026-02-05T10:00:00Z',
  },
]

const mockPendingItems = {
  verification_requests: 12,
  dispute_cases: 3,
  support_tickets: 8,
}

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

function getActivityIcon(type: string) {
  switch (type) {
    case 'user_registered':
      return <Users className="h-4 w-4 text-blue-600" />
    case 'company_registered':
      return <Building2 className="h-4 w-4 text-purple-600" />
    case 'shift_created':
      return <Calendar className="h-4 w-4 text-green-600" />
    case 'payout_requested':
      return <Wallet className="h-4 w-4 text-orange-600" />
    case 'shift_completed':
      return <Activity className="h-4 w-4 text-teal-600" />
    default:
      return <Activity className="h-4 w-4 text-gray-600" />
  }
}

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <div className="flex gap-2">
          {/* Action buttons can be added here */}
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Total Users"
          value={mockSystemStats.total_users.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Total Shifts"
          value={mockSystemStats.total_shifts.toLocaleString()}
          icon={Calendar}
        />
        <StatCard
          title="Active Shifts"
          value={mockSystemStats.active_shifts}
          icon={Activity}
        />
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(mockSystemStats.platform_revenue)}
          subtitle={
            <span className={mockSystemStats.revenue_change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {mockSystemStats.revenue_change >= 0 ? (
                <TrendingUp className="inline h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="inline h-3 w-3 mr-1" />
              )}
              {mockSystemStats.revenue_change}% this month
            </span>
          }
          icon={BarChart3}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Companies"
          value={mockSystemStats.total_companies}
          icon={Building2}
        />
        <StatCard
          title="Agencies"
          value={mockSystemStats.total_agencies}
          icon={Briefcase}
        />
        <StatCard
          title="Pending Applications"
          value={mockSystemStats.pending_applications}
          icon={Calendar}
        />
        <StatCard
          title="Pending Payouts"
          value={mockSystemStats.pending_payouts}
          icon={Wallet}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
              count={mockPendingItems.verification_requests}
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
              count={mockSystemStats.pending_payouts}
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link
              to="/admin/audit"
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                >
                  <div className="p-2 bg-muted rounded-full mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.user}
                      {activity.amount && ` - ${formatCurrency(activity.amount)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Items */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div>
                <p className="font-medium text-yellow-800">Verification Requests</p>
                <p className="text-sm text-yellow-600">Awaiting review</p>
              </div>
              <p className="text-2xl font-bold text-yellow-800">
                {mockPendingItems.verification_requests}
              </p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200">
              <div>
                <p className="font-medium text-red-800">Dispute Cases</p>
                <p className="text-sm text-red-600">Need resolution</p>
              </div>
              <p className="text-2xl font-bold text-red-800">
                {mockPendingItems.dispute_cases}
              </p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div>
                <p className="font-medium text-blue-800">Support Tickets</p>
                <p className="text-sm text-blue-600">Open tickets</p>
              </div>
              <p className="text-2xl font-bold text-blue-800">
                {mockPendingItems.support_tickets}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
