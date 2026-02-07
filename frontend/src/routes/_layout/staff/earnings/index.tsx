import { useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Wallet,
  Zap,
  History,
  Calendar,
  Clock,
  DollarSign,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { useEarnings, useEarningsSummary } from '@/hooks/api/usePaymentsApi'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency, formatDate, formatPayoutDate } from '@/lib/utils'
import { EarningsSummary, EarningsChart, generateChartData } from '@/components/Earnings'

export const Route = createFileRoute('/_layout/staff/earnings/')({
  component: StaffEarningsPage,
})

function StaffEarningsPage() {
  const { isStaff } = useAuth()
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useEarningsSummary()
  const { data: earningsData, isLoading: earningsLoading } = useEarnings()

  // Generate chart data from last 7 days of earnings
  const earnings = useMemo(() => earningsData?.items ?? [], [earningsData])

  const chartData = useMemo(() => {
    return generateChartData(
      earnings.map(e => ({ date: e.date, amount: e.net_amount })),
      'day',
      7
    )
  }, [earnings])

  const isLoading = summaryLoading || earningsLoading

  // Show access denied for non-staff
  if (!isStaff && !isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-muted-foreground">View your earnings and payouts</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Not available"
              description="Earnings are only available for staff users."
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

  if (summaryError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-muted-foreground">View your earnings and payouts</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Unable to load earnings"
              description="There was an error loading your earnings. Please try again."
              action={
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-muted-foreground">
            Track your earnings and get paid
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/staff/earnings/instant-payout">
            <Button className="gap-2">
              <Zap className="h-4 w-4" />
              Get Paid Now
            </Button>
          </Link>
          <Link to="/staff/earnings/payouts">
            <Button variant="outline" className="gap-2">
              <History className="h-4 w-4" />
              Payout History
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <EarningsSummary
        thisWeek={summaryData?.this_week ?? 0}
        thisMonth={summaryData?.this_month ?? 0}
        allTime={summaryData?.all_time ?? 0}
        availableBalance={summaryData?.available_balance ?? 0}
        pendingEarnings={summaryData?.pending_earnings ?? 0}
        nextPayoutDate={summaryData?.next_payout_date ?? null}
        nextPayoutAmount={summaryData?.next_payout_amount ?? 0}
        isLoading={summaryLoading}
      />

      {/* Next Payout Banner */}
      {summaryData && summaryData.pending_earnings > 0 && (
        <Card className="bg-brand-50 border-brand-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-100 rounded-full">
                  <Calendar className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <p className="font-medium">Next Payout {formatPayoutDate(summaryData.next_payout_date)}</p>
                  <p className="text-sm text-muted-foreground">
                    Estimated: {formatCurrency(summaryData.next_payout_amount)}
                  </p>
                </div>
              </div>
              <Link to="/staff/earnings/instant-payout">
                <Button size="sm" variant="outline" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Get Paid Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Chart */}
      <EarningsChart
        data={chartData}
        title="Earnings This Week"
        isLoading={earningsLoading}
      />

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Earnings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[72px]" />
              <Skeleton className="h-[72px]" />
              <Skeleton className="h-[72px]" />
            </div>
          ) : earnings.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No earnings yet"
              description="Complete shifts to start earning. Your earnings will appear here."
              action={
                <Link to="/marketplace">
                  <Button size="sm">
                    Browse Shifts
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {earnings.slice(0, 10).map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-full">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{earning.shift_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(earning.date)} - {earning.hours_worked}h at {formatCurrency(earning.hourly_rate)}/hr
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-green-600">
                      {formatCurrency(earning.net_amount)}
                    </span>
                    {earning.status === 'pending' ? (
                      <Badge variant="warning" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="success">Paid</Badge>
                    )}
                  </div>
                </div>
              ))}
              {earnings.length > 10 && (
                <div className="text-center pt-2">
                  <Link to="/wallet/transactions" className="text-sm text-brand-600 hover:underline flex items-center justify-center gap-1">
                    View all earnings <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
