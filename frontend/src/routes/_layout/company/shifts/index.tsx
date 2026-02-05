import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Calendar, Users, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useShifts } from '@/hooks/api/useShiftsApi'
import type { Shift } from '@/types/shift'

export const Route = createFileRoute('/_layout/company/shifts/')({
  component: CompanyShiftsPage,
})

function CompanyShiftsPage() {
  const [activeTab, setActiveTab] = useState('active')

  // Fetch all company shifts - the API will filter by company_id automatically for company users
  const { data, isLoading, error } = useShifts({})

  // Group shifts by status
  const groupedShifts = useMemo(() => {
    const shifts = data?.items ?? []
    return {
      active: shifts.filter((s) => s.status === 'open'),
      filled: shifts.filter((s) => s.status === 'assigned' || s.status === 'in_progress'),
      completed: shifts.filter((s) => s.status === 'completed'),
      draft: shifts.filter((s) => s.status === 'draft'),
    }
  }, [data])

  const getStatusBadge = (status: string, spotsTotal: number, spotsFilled: number) => {
    if (status === 'open') {
      if (spotsFilled === spotsTotal) return <Badge variant="success">Filled</Badge>
      if (spotsFilled > 0) return <Badge variant="warning">{spotsTotal - spotsFilled} Open</Badge>
      return <Badge variant="success">Open</Badge>
    }
    if (status === 'assigned' || status === 'filled') return <Badge variant="success">Filled</Badge>
    if (status === 'in_progress') return <Badge variant="warning">In Progress</Badge>
    if (status === 'completed') return <Badge variant="secondary">Completed</Badge>
    if (status === 'draft') return <Badge variant="outline">Draft</Badge>
    if (status === 'cancelled') return <Badge variant="destructive">Cancelled</Badge>
    return <Badge>{status}</Badge>
  }

  const renderShiftList = (shifts: Shift[], showApplicants = false) => {
    if (shifts.length === 0) {
      return (
        <EmptyState
          icon={Calendar}
          title="No shifts"
          description={
            activeTab === 'active'
              ? "You don't have any active shifts. Create one to start hiring."
              : `No ${activeTab} shifts.`
          }
          action={
            activeTab === 'active' || activeTab === 'draft' ? (
              <Link to="/company/shifts/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Shift
                </Button>
              </Link>
            ) : undefined
          }
        />
      )
    }

    return (
      <div className="space-y-3">
        {shifts.map((shift) => (
          <Card key={shift.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-center min-w-0 shrink-0">
                    <p className="text-sm font-medium truncate">{formatDate(shift.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{shift.title}</p>
                      {shift.spots_total > 1 && (
                        <span className="text-sm text-muted-foreground">
                          x{shift.spots_total}
                        </span>
                      )}
                      {getStatusBadge(shift.status, shift.spots_total, shift.spots_filled)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(shift.hourly_rate)}/hr
                    </p>
                    {shift.location_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {shift.location_name}, {shift.city}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {showApplicants && shift.status === 'open' && (
                    <Link to={`/company/shifts/${shift.id}/applicants`}>
                      <Button variant="outline" size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        View Applicants
                      </Button>
                    </Link>
                  )}
                  <Link to={`/company/shifts/${shift.id}/edit`}>
                    <Button variant="outline" size="sm">
                      {shift.status === 'draft' ? 'Edit' : 'View'}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Shifts</h1>
            <p className="text-muted-foreground">Manage your posted shifts</p>
          </div>
          <Link to="/company/shifts/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Shift
            </Button>
          </Link>
        </div>
        <EmptyState
          icon={AlertCircle}
          title="Failed to load shifts"
          description="There was an error loading your shifts. Please try again later."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Shifts</h1>
          <p className="text-muted-foreground">Manage your posted shifts</p>
        </div>
        <Link to="/company/shifts/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Shift
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">
              Active ({groupedShifts.active.length})
            </TabsTrigger>
            <TabsTrigger value="filled">
              Filled ({groupedShifts.filled.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({groupedShifts.completed.length})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Drafts ({groupedShifts.draft.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {renderShiftList(groupedShifts.active, true)}
          </TabsContent>
          <TabsContent value="filled" className="mt-6">
            {renderShiftList(groupedShifts.filled)}
          </TabsContent>
          <TabsContent value="completed" className="mt-6">
            {renderShiftList(groupedShifts.completed)}
          </TabsContent>
          <TabsContent value="draft" className="mt-6">
            {renderShiftList(groupedShifts.draft)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
