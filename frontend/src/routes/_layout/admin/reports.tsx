import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_layout/admin/reports')({
  component: ReportsPage,
})

const mockReportData = {
  revenue: { current: 48520, previous: 42100, change: 15.2 },
  users: { current: 5247, previous: 4890, change: 7.3 },
  shifts: { current: 1247, previous: 1102, change: 13.2 },
  fillRate: { current: 94, previous: 91, change: 3.3 },
}

const mockReports = [
  { id: '1', name: 'Monthly Revenue Report', description: 'Detailed breakdown of platform revenue', period: 'January 2026', type: 'revenue' },
  { id: '2', name: 'User Growth Report', description: 'New registrations and user activity', period: 'January 2026', type: 'users' },
  { id: '3', name: 'Shift Analytics', description: 'Shift posting, fill rates, and trends', period: 'January 2026', type: 'shifts' },
  { id: '4', name: 'Payout Summary', description: 'Worker and agency payouts', period: 'January 2026', type: 'payouts' },
]

function ReportsPage() {
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
            <p className="text-2xl font-bold">{formatCurrency(mockReportData.revenue.current)}</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{mockReportData.revenue.change}% vs last month
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
            <p className="text-2xl font-bold">{mockReportData.users.current.toLocaleString()}</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{mockReportData.users.change}% vs last month
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
            <p className="text-2xl font-bold">{mockReportData.shifts.current.toLocaleString()}</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{mockReportData.shifts.change}% vs last month
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
            <p className="text-2xl font-bold">{mockReportData.fillRate.current}%</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{mockReportData.fillRate.change}% vs last month
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
            {mockReports.map((report) => (
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
