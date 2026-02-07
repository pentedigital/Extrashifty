import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { Calendar, Users, Euro, Star, ArrowRight, Plus, AlertCircle, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useCompanyStats, useCompanyShifts, useCompanyWallet } from '@/hooks/api/useCompanyApi'

export function CompanyDashboard() {
  // Fetch real data from API
  const { data: stats, isLoading: statsLoading, error: statsError } = useCompanyStats()
  const { data: shiftsData, isLoading: shiftsLoading } = useCompanyShifts({ status: 'open' })
  const { data: wallet, isLoading: walletLoading } = useCompanyWallet()

  // Process shifts for attention-needing and upcoming
  const shiftsNeedingAttention = useMemo(() => {
    if (!shiftsData?.items) return []
    return shiftsData.items
      .filter((shift) => shift.spots_filled < shift.spots_total)
      .slice(0, 5)
      .map((shift) => ({
        id: String(shift.id),
        title: shift.title,
        date: shift.date,
        start_time: shift.start_time,
        applicants: shift.applications_count ?? 0,
        spots_filled: shift.spots_filled,
        spots_total: shift.spots_total,
      }))
  }, [shiftsData])

  const upcomingShifts = useMemo(() => {
    if (!shiftsData?.items) return []
    const today = new Date().toISOString().split('T')[0]
    return shiftsData.items
      .filter((shift) => shift.date >= today && shift.spots_filled > 0)
      .slice(0, 5)
      .map((shift) => ({
        id: String(shift.id),
        title: shift.title,
        date: shift.date,
        start_time: shift.start_time,
        worker_name: shift.assigned_workers?.[0]?.full_name ?? null,
        spots_filled: shift.spots_filled,
        spots_total: shift.spots_total,
        status: shift.spots_filled === shift.spots_total ? 'filled' : 'partial',
      }))
  }, [shiftsData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Manage your shifts and workers."
        actions={
          <Link to="/company/shifts/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Post Shift
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="dashboard-stats-grid">
        {statsLoading ? (
          <>
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
          </>
        ) : statsError ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center gap-2 py-4 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load stats. Please try again.</span>
            </CardContent>
          </Card>
        ) : (
          <>
            <StatCard
              title="Active Shifts"
              value={stats?.active_shifts ?? 0}
              icon={Calendar}
              iconColor="brand"
            />
            <StatCard
              title="Pending Applications"
              value={stats?.pending_applications ?? 0}
              icon={Users}
              iconColor="warning"
            />
            <StatCard
              title="Spent This Month"
              value={formatCurrency(stats?.total_spent ?? 0)}
              icon={Euro}
              iconColor="destructive"
            />
            <StatCard
              title="Wallet Balance"
              value={walletLoading ? '-' : formatCurrency(wallet?.balance ?? 0)}
              icon={Wallet}
              iconColor="info"
            />
            <StatCard
              title="Company Rating"
              value={stats?.average_rating ? stats.average_rating.toFixed(1) : 'N/A'}
              icon={Star}
              iconColor="success"
            />
          </>
        )}
      </div>

      {/* Shifts Needing Attention */}
      {shiftsLoading ? (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Shifts Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </CardContent>
        </Card>
      ) : shiftsNeedingAttention.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Shifts Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shiftsNeedingAttention.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg bg-white border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{shift.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(shift.date)} at {formatTime(shift.start_time)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {shift.applicants > 0 ? (
                      <Badge variant="default">{shift.applicants} applicants</Badge>
                    ) : (
                      <Badge variant="outline">No applicants</Badge>
                    )}
                    <Link to={`/company/shifts/${shift.id}/applicants`}>
                      <Button size="sm" variant={shift.applicants > 0 ? 'default' : 'outline'}>
                        {shift.applicants > 0 ? 'Review' : 'Edit'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Shifts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Shifts</CardTitle>
          <Link to="/company/shifts" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {shiftsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : upcomingShifts.length > 0 ? (
            <div className="space-y-4">
              {upcomingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(shift.date).split(',')[0]}
                      </p>
                      <p className="font-semibold">{formatTime(shift.start_time)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{shift.title}</p>
                      {shift.worker_name ? (
                        <p className="text-sm text-muted-foreground">
                          {shift.worker_name}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {shift.spots_filled}/{shift.spots_total} filled
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={shift.status === 'filled' ? 'success' : 'warning'}
                  >
                    {shift.status === 'filled' ? 'Filled' : `${shift.spots_total - shift.spots_filled} Pending`}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No upcoming shifts</p>
              <Link to="/company/shifts/create">
                <Button variant="link" className="mt-2">
                  Post your first shift
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
