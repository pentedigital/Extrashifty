import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Calendar, Search } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export const Route = createFileRoute('/_layout/shifts/')({
  component: MyShiftsPage,
})

// TODO: Replace with actual API data from useMyShifts hook
// Placeholder empty data structure until API integration is complete
const mockShifts = {
  upcoming: [] as Array<{
    id: string
    title: string
    company_name: string
    date: string
    start_time: string
    end_time: string
    hourly_rate: number
    total_pay: number
    status: string
  }>,
  in_progress: [] as Array<{
    id: string
    title: string
    company_name: string
    date: string
    start_time: string
    end_time: string
    hourly_rate: number
    total_pay: number
    status: string
  }>,
  completed: [] as Array<{
    id: string
    title: string
    company_name: string
    date: string
    start_time: string
    end_time: string
    hourly_rate: number
    total_pay: number
    status: string
  }>,
  cancelled: [] as Array<{
    id: string
    title: string
    company_name: string
    date: string
    start_time: string
    end_time: string
    hourly_rate: number
    total_pay: number
    status: string
  }>,
}

function MyShiftsPage() {
  const [activeTab, setActiveTab] = useState('upcoming')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const renderShiftList = (shifts: typeof mockShifts.upcoming) => {
    if (shifts.length === 0) {
      return (
        <EmptyState
          icon={Calendar}
          title="No shifts"
          description={
            activeTab === 'upcoming'
              ? "You don't have any upcoming shifts. Browse the marketplace to find work."
              : `No ${activeTab.replace('_', ' ')} shifts.`
          }
          action={
            activeTab === 'upcoming' ? (
              <Link to="/marketplace">
                <Button>
                  <Search className="mr-2 h-4 w-4" />
                  Find Shifts
                </Button>
              </Link>
            ) : undefined
          }
        />
      )
    }

    // Group by date for upcoming shifts
    const groupedByDate: Record<string, typeof shifts> = {}
    shifts.forEach((shift) => {
      const dateKey = shift.date
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(shift)
    })

    return (
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, dateShifts]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {formatDate(date)}
            </h3>
            <div className="space-y-3">
              {dateShifts.map((shift) => (
                <Card key={shift.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[80px]">
                          <p className="text-sm text-muted-foreground">
                            {formatTime(shift.start_time)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            to {formatTime(shift.end_time)}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{shift.title}</p>
                            {getStatusBadge(shift.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            @ {shift.company_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-brand-600">
                          {formatCurrency(shift.total_pay)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(shift.hourly_rate)}/hr
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Shifts</h1>
          <p className="text-muted-foreground">Track your upcoming and past shifts</p>
        </div>
        <Link to="/marketplace">
          <Button>
            <Search className="mr-2 h-4 w-4" />
            Find Shifts
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({mockShifts.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({mockShifts.in_progress.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({mockShifts.completed.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({mockShifts.cancelled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {renderShiftList(mockShifts.upcoming)}
        </TabsContent>
        <TabsContent value="in_progress" className="mt-6">
          {renderShiftList(mockShifts.in_progress)}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {renderShiftList(mockShifts.completed)}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-6">
          {renderShiftList(mockShifts.cancelled)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
