import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowLeft,
  DollarSign,
  Users,
  Building,
  Download,
  Filter,
  AlertCircle,
} from 'lucide-react'
import { useAgencyEarnings } from '@/hooks/api/usePaymentsApi'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import { EarningsChart } from '@/components/Earnings'

export const Route = createFileRoute('/_layout/agency/billing/earnings')({
  component: AgencyEarningsPage,
})

function AgencyEarningsPage() {
  const { isAgency } = useAuth()
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'staff' | 'client'>('staff')

  const { data, isLoading } = useAgencyEarnings({
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })

  const byStaff = data?.by_staff ?? []
  const byClient = data?.by_client ?? []
  const totalEarnings = data?.total_earnings ?? 0

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
  }

  const hasFilters = startDate || endDate

  // Generate mock chart data with deterministic distribution
  const chartData = useMemo(() => {
    const weights = [0.22, 0.28, 0.25, 0.25]
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    return weeks.map((label, i) => ({
      label,
      amount: Math.floor(totalEarnings * weights[i]),
    }))
  }, [totalEarnings])

  const handleExportCSV = () => {
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,'

    if (activeTab === 'staff') {
      csvContent += 'Staff Name,Total Earnings,Shifts Completed,Hours Worked\n'
      byStaff.forEach(s => {
        csvContent += `"${s.staff_name}",${s.total_earnings},${s.shift_count},${s.hours_worked}\n`
      })
    } else {
      csvContent += 'Client Name,Total Earnings,Shifts,Invoices\n'
      byClient.forEach(c => {
        csvContent += `"${c.client_name}",${c.total_earnings},${c.shift_count},${c.invoice_count}\n`
      })
    }

    // Download
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `agency-earnings-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Show access denied for non-agency
  if (!isAgency && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/agency/billing">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Earnings Breakdown</h1>
            <p className="text-muted-foreground">View your agency earnings</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Not available"
              description="This page is only available for agency users."
              action={
                <Link to="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/agency/billing">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Earnings Breakdown</h1>
          <p className="text-muted-foreground">View earnings by staff and client</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Staff</p>
                    <p className="text-2xl font-bold">{byStaff.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Clients</p>
                    <p className="text-2xl font-bold">{byClient.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Building className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Chart */}
      <EarningsChart
        data={chartData}
        title="Earnings This Month"
        isLoading={isLoading}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Time Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">From Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">To Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Breakdown</CardTitle>
          <CardDescription>
            View earnings grouped by staff member or client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'staff' | 'client')}>
            <TabsList className="mb-4">
              <TabsTrigger value="staff" className="gap-2">
                <Users className="h-4 w-4" />
                By Staff Member
              </TabsTrigger>
              <TabsTrigger value="client" className="gap-2">
                <Building className="h-4 w-4" />
                By Client
              </TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-[60px]" />
                  <Skeleton className="h-[60px]" />
                  <Skeleton className="h-[60px]" />
                </div>
              ) : byStaff.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No staff earnings"
                  description="Earnings from placed staff will appear here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Staff Member</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Earnings</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Shifts</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byStaff.map((staff) => (
                        <tr key={staff.staff_id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium">{staff.staff_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">
                            {formatCurrency(staff.total_earnings)}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {staff.shift_count}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {staff.hours_worked}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50">
                        <td className="py-3 px-4 font-semibold">Total</td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">
                          {formatCurrency(byStaff.reduce((sum, s) => sum + s.total_earnings, 0))}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {byStaff.reduce((sum, s) => sum + s.shift_count, 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {byStaff.reduce((sum, s) => sum + s.hours_worked, 0)}h
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="client">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-[60px]" />
                  <Skeleton className="h-[60px]" />
                  <Skeleton className="h-[60px]" />
                </div>
              ) : byClient.length === 0 ? (
                <EmptyState
                  icon={Building}
                  title="No client earnings"
                  description="Earnings from clients will appear here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Client</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Earnings</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Shifts</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Invoices</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byClient.map((client) => (
                        <tr key={client.client_id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                <Building className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium">{client.client_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">
                            {formatCurrency(client.total_earnings)}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {client.shift_count}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {client.invoice_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50">
                        <td className="py-3 px-4 font-semibold">Total</td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">
                          {formatCurrency(byClient.reduce((sum, c) => sum + c.total_earnings, 0))}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {byClient.reduce((sum, c) => sum + c.shift_count, 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {byClient.reduce((sum, c) => sum + c.invoice_count, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
