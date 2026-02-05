import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowLeft,
  History,
  Calendar,
  Building,
  CreditCard,
  Check,
  Clock,
  AlertCircle,
  ArrowRight,
  Filter,
  Download,
  Loader2,
} from 'lucide-react'
import { usePayoutHistory, type PayoutStatus } from '@/hooks/api/usePaymentsApi'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_layout/staff/earnings/payouts')({
  component: PayoutsHistoryPage,
})

function PayoutsHistoryPage() {
  const { isStaff } = useAuth()
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all')

  const { data, isLoading, error } = usePayoutHistory({
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })

  const payouts = data?.items ?? []

  // Apply status filter
  const filteredPayouts = useMemo(() => {
    if (statusFilter === 'all') return payouts
    return payouts.filter(p => p.status === statusFilter)
  }, [payouts, statusFilter])

  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" />
            Paid
          </Badge>
        )
      case 'in_transit':
        return (
          <Badge variant="warning" className="gap-1">
            <ArrowRight className="h-3 w-3" />
            In Transit
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="default" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-IE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString))
  }

  const getMethodIcon = (method: string) => {
    if (method === 'bank_account') {
      return <Building className="h-4 w-4" />
    }
    return <CreditCard className="h-4 w-4" />
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setStatusFilter('all')
  }

  const hasFilters = startDate || endDate || statusFilter !== 'all'

  // Show access denied for non-staff
  if (!isStaff && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/staff/earnings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Payout History</h1>
            <p className="text-muted-foreground">View your past payouts</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Not available"
              description="Payouts are only available for staff users."
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
        <Link to="/staff/earnings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Payout History</h1>
          <p className="text-muted-foreground">View your past payouts and their status</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
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
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PayoutStatus | 'all')}
                className="h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Payouts
            </CardTitle>
            <CardDescription>
              {filteredPayouts.length} payout{filteredPayouts.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[72px]" />
              <Skeleton className="h-[72px]" />
              <Skeleton className="h-[72px]" />
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title="Error loading payouts"
              description="There was an error loading your payout history. Please try again."
              action={
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              }
            />
          ) : filteredPayouts.length === 0 ? (
            <EmptyState
              icon={History}
              title="No payouts found"
              description={hasFilters ? "No payouts match your filters. Try adjusting your search criteria." : "You haven't received any payouts yet. Complete shifts and request payouts to see them here."}
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Link to="/staff/earnings">
                    <Button>View Earnings</Button>
                  </Link>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(payout.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(payout.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getMethodIcon(payout.method)}
                          <span className="text-sm">
                            ****{payout.method_last_four}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
