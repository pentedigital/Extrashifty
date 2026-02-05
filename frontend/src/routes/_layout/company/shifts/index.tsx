import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Calendar, Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export const Route = createFileRoute('/_layout/company/shifts/')({
  component: CompanyShiftsPage,
})

// Mock data
const mockShifts = {
  active: [
    {
      id: '1',
      title: 'Bartender',
      date: '2026-02-07',
      start_time: '18:00',
      end_time: '00:00',
      hourly_rate: 18,
      spots_total: 1,
      spots_filled: 0,
      applicants: 3,
      status: 'open',
    },
    {
      id: '2',
      title: 'Server',
      date: '2026-02-08',
      start_time: '12:00',
      end_time: '20:00',
      hourly_rate: 16,
      spots_total: 2,
      spots_filled: 1,
      applicants: 5,
      status: 'open',
    },
  ],
  upcoming: [
    {
      id: '3',
      title: 'Bartender',
      date: '2026-02-06',
      start_time: '18:00',
      end_time: '00:00',
      hourly_rate: 18,
      spots_total: 1,
      spots_filled: 1,
      worker: 'John D.',
      status: 'filled',
    },
  ],
  completed: [
    {
      id: '4',
      title: 'Line Cook',
      date: '2026-02-01',
      start_time: '06:00',
      end_time: '14:00',
      hourly_rate: 20,
      spots_total: 1,
      spots_filled: 1,
      worker: 'Maria S.',
      status: 'completed',
    },
  ],
  draft: [],
}

function CompanyShiftsPage() {
  const [activeTab, setActiveTab] = useState('active')

  const getStatusBadge = (status: string, spotsTotal: number, spotsFilled: number) => {
    if (status === 'open') {
      if (spotsFilled === spotsTotal) return <Badge variant="success">Filled</Badge>
      if (spotsFilled > 0) return <Badge variant="warning">{spotsTotal - spotsFilled} Open</Badge>
      return <Badge variant="success">Open</Badge>
    }
    if (status === 'filled') return <Badge variant="success">Filled</Badge>
    if (status === 'completed') return <Badge variant="secondary">Completed</Badge>
    if (status === 'draft') return <Badge variant="outline">Draft</Badge>
    return <Badge>{status}</Badge>
  }

  const renderShiftList = (shifts: typeof mockShifts.active, showApplicants = false) => {
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
                    {'worker' in shift && shift.worker && (
                      <p className="text-sm text-muted-foreground truncate">
                        Assigned: {shift.worker}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {showApplicants && 'applicants' in shift && shift.applicants > 0 && (
                    <Link to={`/company/shifts/${shift.id}/applicants`}>
                      <Button variant="outline" size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        {shift.applicants} Applicants
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({mockShifts.active.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Filled ({mockShifts.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({mockShifts.completed.length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({mockShifts.draft.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {renderShiftList(mockShifts.active, true)}
        </TabsContent>
        <TabsContent value="upcoming" className="mt-6">
          {renderShiftList(mockShifts.upcoming)}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {renderShiftList(mockShifts.completed)}
        </TabsContent>
        <TabsContent value="draft" className="mt-6">
          {renderShiftList(mockShifts.draft)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
