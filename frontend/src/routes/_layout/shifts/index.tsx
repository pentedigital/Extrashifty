import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Calendar, Search, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useMyShifts } from '@/hooks/api/useShiftsApi'

export const Route = createFileRoute('/_layout/shifts/')({
  component: MyShiftsPage,
})

// Type for processed shift data
interface ProcessedShift {
  id: string
  title: string
  company_name: string
  date: string
  start_time: string
  end_time: string
  hourly_rate: number
  total_pay: number
  status: string
}

function MyShiftsPage() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const { data: shiftsData, isLoading, error } = useMyShifts()

  // Process shifts data into categorized lists
  const categorizedShifts = useMemo(() => {
    const result: {
      upcoming: ProcessedShift[]
      in_progress: ProcessedShift[]
      completed: ProcessedShift[]
      cancelled: ProcessedShift[]
    } = {
      upcoming: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    }

    if (!shiftsData) return result

    const shifts = Array.isArray(shiftsData) ? shiftsData : []

    for (const shift of shifts) {
      // Calculate total pay from hourly rate and hours
      const startTime = shift.start_time || '00:00'
      const endTime = shift.end_time || '00:00'
      const startParts = startTime.split(':').map(Number)
      const endParts = endTime.split(':').map(Number)
      const startMinutes = (startParts[0] || 0) * 60 + (startParts[1] || 0)
      let endMinutes = (endParts[0] || 0) * 60 + (endParts[1] || 0)
      if (endMinutes < startMinutes) endMinutes += 24 * 60 // Handle overnight shifts
      const hours = (endMinutes - startMinutes) / 60
      const totalPay = hours * (shift.hourly_rate || 0)

      const processedShift: ProcessedShift = {
        id: String(shift.id),
        title: shift.title || 'Untitled Shift',
        company_name: shift.company?.business_name || shift.company_name || 'Unknown Company',
        date: shift.date || '',
        start_time: startTime,
        end_time: endTime,
        hourly_rate: shift.hourly_rate || 0,
        total_pay: totalPay,
        status: shift.status || 'upcoming',
      }

      // Categorize by status
      const status = (shift.status || '').toLowerCase()
      if (status === 'in_progress' || status === 'active') {
        result.in_progress.push(processedShift)
      } else if (status === 'completed' || status === 'finished') {
        result.completed.push(processedShift)
      } else if (status === 'cancelled') {
        result.cancelled.push(processedShift)
      } else {
        // Default to upcoming for confirmed, scheduled, etc.
        result.upcoming.push(processedShift)
      }
    }

    return result
  }, [shiftsData])

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
          <h1 className="text-2xl font-bold">My Shifts</h1>
          <p className="text-muted-foreground">Track your upcoming and past shifts</p>
        </div>
        <EmptyState
          icon={Calendar}
          title="Unable to load shifts"
          description="There was an error loading your shifts. Please try again later."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      </div>
    )
  }

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

  const renderShiftList = (shifts: ProcessedShift[]) => {
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
            Upcoming ({categorizedShifts.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({categorizedShifts.in_progress.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({categorizedShifts.completed.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({categorizedShifts.cancelled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {renderShiftList(categorizedShifts.upcoming)}
        </TabsContent>
        <TabsContent value="in_progress" className="mt-6">
          {renderShiftList(categorizedShifts.in_progress)}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {renderShiftList(categorizedShifts.completed)}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-6">
          {renderShiftList(categorizedShifts.cancelled)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
