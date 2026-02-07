import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Plus, Users, AlertCircle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatTime } from '@/lib/utils'
import { useAgencySchedule } from '@/hooks/api/useAgencyApi'

export const Route = createFileRoute('/_layout/agency/schedule/')({
  component: SchedulePage,
})

// Schedule entry type definition
type ScheduleEntry = {
  id: string
  time: string
  end_time: string
  title: string
  client: string
  workers: string[]
  spots_total: number
  spots_filled: number
  status: string
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date()) // Use current date

  // Calculate week date range for the API query
  const weekDateRange = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return {
      start_date: startOfWeek.toISOString().split('T')[0],
      end_date: endOfWeek.toISOString().split('T')[0],
    }
  }, [currentDate])

  // Fetch schedule data from API
  const { data: scheduleData, isLoading } = useAgencySchedule(weekDateRange)

  // The schedule data is already in the correct format from the hook
  const schedule: Record<string, ScheduleEntry[]> = scheduleData || {}

  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(date.getDate() + i)
      return date
    })
  }

  const weekDates = getWeekDates()

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const getShiftsForDate = (date: Date) => {
    const key = formatDateKey(date)
    return schedule[key] || []
  }

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction * 7)
    setCurrentDate(newDate)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return formatDateKey(date) === formatDateKey(today)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success/10 border-success/40 text-success'
      case 'partial':
        return 'bg-warning/10 border-warning/40 text-warning'
      case 'unfilled':
        return 'bg-destructive/10 border-destructive/40 text-destructive'
      default:
        return 'bg-muted border-border text-foreground'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">
            View and manage all staff assignments
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Shift
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-medium ml-2">
            {weekDates[0].toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={() => setCurrentDate(new Date())}
        >
          Today
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Week Calendar - Desktop */}
      <Card className={cn("hidden md:block", isLoading && "opacity-50")}>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {weekDates.map((date, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-3 text-center border-r last:border-r-0',
                  isToday(date) && 'bg-brand-50'
                )}
              >
                <p className="text-sm text-muted-foreground">
                  {daysOfWeek[date.getDay()]}
                </p>
                <p
                  className={cn(
                    'text-lg font-semibold',
                    isToday(date) && 'text-brand-600'
                  )}
                >
                  {date.getDate()}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDates.map((date, idx) => {
              const shifts = getShiftsForDate(date)
              return (
                <div
                  key={idx}
                  className={cn(
                    'border-r last:border-r-0 p-2 space-y-2',
                    isToday(date) && 'bg-brand-50/50'
                  )}
                >
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={cn(
                        'rounded-lg border p-2 text-xs cursor-pointer hover:shadow-sm transition-shadow',
                        getStatusColor(shift.status)
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {formatTime(shift.time)}
                        </span>
                        {shift.status === 'confirmed' && (
                          <Check className="h-3 w-3" />
                        )}
                        {shift.status === 'partial' && (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {shift.status === 'unfilled' && (
                          <AlertCircle className="h-3 w-3" />
                        )}
                      </div>
                      <p className="font-medium truncate">{shift.title}</p>
                      <p className="text-[10px] opacity-75 truncate">
                        {shift.client}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        <span>
                          {shift.spots_filled}/{shift.spots_total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Week Calendar - Mobile (List View) */}
      <div className="md:hidden space-y-3">
        {weekDates.map((date, idx) => {
          const shifts = getShiftsForDate(date)
          if (shifts.length === 0 && !isToday(date)) return null
          return (
            <Card
              key={idx}
              className={cn(isToday(date) && 'border-brand-300 bg-brand-50/30')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className={cn(isToday(date) && 'text-brand-600')}>
                    {daysOfWeek[date.getDay()]} {date.getDate()}
                  </span>
                  {isToday(date) && (
                    <Badge variant="default" className="text-xs">Today</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {shifts.length > 0 ? (
                  shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={cn(
                        'rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow',
                        getStatusColor(shift.status)
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{shift.title}</p>
                          <p className="text-sm opacity-75">{shift.client}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatTime(shift.time)} - {formatTime(shift.end_time)}
                          </p>
                          <div className="flex items-center justify-end gap-1 text-sm">
                            <Users className="h-3 w-3" />
                            <span>{shift.spots_filled}/{shift.spots_total}</span>
                          </div>
                        </div>
                      </div>
                      {shift.workers.length > 0 && (
                        <p className="text-xs mt-2 opacity-75">
                          Staff: {shift.workers.join(', ')}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2">No shifts scheduled</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-success/20 border border-success/50" />
          <span>Filled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-warning/20 border border-warning/50" />
          <span>Partially Filled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-destructive/20 border border-destructive/50" />
          <span>Unfilled</span>
        </div>
      </div>
    </div>
  )
}
