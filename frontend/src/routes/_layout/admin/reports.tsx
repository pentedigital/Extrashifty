import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, Users, Calendar, DollarSign, Loader2, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAdminReports } from '@/hooks/api/useAdminApi'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_layout/admin/reports')({
  component: ReportsPage,
})

// Static report templates that can be generated
const reportTemplates = [
  { id: '1', name: 'Monthly Revenue Report', description: 'Detailed breakdown of platform revenue', period: 'January 2026', type: 'revenue' },
  { id: '2', name: 'User Growth Report', description: 'New registrations and user activity', period: 'January 2026', type: 'users' },
  { id: '3', name: 'Shift Analytics', description: 'Shift posting, fill rates, and trends', period: 'January 2026', type: 'shifts' },
  { id: '4', name: 'Payout Summary', description: 'Worker and agency payouts', period: 'January 2026', type: 'payouts' },
]

function ReportsPage() {
  // Fetch reports data from API
  const { data: reportsData, isLoading, error } = useAdminReports()

  // Process report summary data
  const reportSummary = useMemo(() => {
    const summary = reportsData?.summary || {}
    return {
      revenue: {
        current: summary.total_revenue || 0,
        previous: summary.previous_revenue || 0,
        change: summary.revenue_change || 0
      },
      users: {
        current: summary.total_users || 0,
        previous: summary.previous_users || 0,
        change: summary.users_change || 0
      },
      shifts: {
        current: summary.total_shifts || 0,
        previous: summary.previous_shifts || 0,
        change: summary.shifts_change || 0
      },
      fillRate: {
        current: summary.fill_rate || 0,
        previous: summary.previous_fill_rate || 0,
        change: summary.fill_rate_change || 0
      },
    }
  }, [reportsData])

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
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Platform analytics and insights</p>
        </div>
        <EmptyState
          icon={Search}
          title="Unable to load reports"
          description="There was an error loading reports. Please try again later."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Platform analytics and insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue (MTD)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(reportSummary.revenue.current)}</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{reportSummary.revenue.change}% vs last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportSummary.users.current.toLocaleString()}</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{reportSummary.users.change}% vs last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Shifts (MTD)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportSummary.shifts.current.toLocaleString()}</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{reportSummary.shifts.change}% vs last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Fill Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportSummary.fillRate.current}%</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{reportSummary.fillRate.change}% vs last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>Download detailed reports for analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reportTemplates.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{report.name}</p>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Period: {report.period}</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
