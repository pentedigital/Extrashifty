import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Plus, Users, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatTime } from '@/lib/utils'

export const Route = createFileRoute('/_layout/agency/schedule/')({
  component: SchedulePage,
})

// Mock data
const mockSchedule = {
  '2026-02-04': [
    {
      id: '1',
      time: '06:00',
      end_time: '14:00',
      title: 'Kitchen Porter',
      client: 'Hotel ABC',
      workers: ['John D.'],
      spots_total: 1,
      spots_filled: 1,
      status: 'confirmed',
    },
    {
      id: '2',
      time: '09:00',
      end_time: '17:00',
      title: 'Server',
      client: 'Café Central',
      workers: ['Maria S.', 'Tom W.'],
      spots_total: 3,
      spots_filled: 2,
      status: 'partial',
    },
    {
      id: '3',
      time: '18:00',
      end_time: '00:00',
      title: 'Bartender',
      client: 'The Local',
      workers: ['Sarah C.', 'Ali H.'],
      spots_total: 2,
      spots_filled: 2,
      status: 'confirmed',
    },
  ],
  '2026-02-05': [
    {
      id: '4',
      time: '07:00',
      end_time: '15:00',
      title: 'Line Cook',
      client: 'Hotel ABC',
      workers: ['Maria S.'],
      spots_total: 1,
      spots_filled: 1,
      status: 'confirmed',
    },
    {
      id: '5',
      time: '11:00',
      end_time: '19:00',
      title: 'Server',
      client: 'Restaurant XYZ',
      workers: [],
      spots_total: 2,
      spots_filled: 0,
      status: 'unfilled',
    },
  ],
  '2026-02-06': [
    {
      id: '6',
      time: '18:00',
      end_time: '02:00',
      title: 'Bartender',
      client: 'The Local',
      workers: ['John D.'],
      spots_total: 1,
      spots_filled: 1,
      status: 'confirmed',
    },
  ],
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 4)) // Feb 4, 2026
  const [view, setView] = useState<'week' | 'day'>('week')

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
    return mockSchedule[key as keyof typeof mockSchedule] || []
  }

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction * 7)
    setCurrentDate(newDate)
  }

  const isToday = (date: Date) => {
    const today = new Date(2026, 1, 4) // Simulated today
    return formatDateKey(date) === formatDateKey(today)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'partial':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'unfilled':
        return 'bg-red-100 border-red-300 text-red-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
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
          onClick={() => setCurrentDate(new Date(2026, 1, 4))}
        >
          Today
        </Button>
      </div>

      {/* Week Calendar - Desktop */}
      <Card className="hidden md:block">
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
          <div className="h-3 w-3 rounded bg-green-200 border border-green-400" />
          <span>Filled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-yellow-200 border border-yellow-400" />
          <span>Partially Filled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-200 border border-red-400" />
          <span>Unfilled</span>
        </div>
      </div>
    </div>
  )
}
