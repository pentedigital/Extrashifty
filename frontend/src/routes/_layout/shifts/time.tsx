import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Clock, Play, Square, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockApi } from '@/lib/mockApi'
import { formatDate, formatTime } from '@/lib/utils'
import type { ClockRecord } from '@/types/staff'

export const Route = createFileRoute('/_layout/shifts/time')({
  component: TimeTrackingPage,
})

// Mock shift details for display purposes
const mockShiftDetails: Record<string, { title: string; business_name: string }> = {
  s1: { title: 'Bartender', business_name: 'The Brazen Head' },
  s2: { title: 'Server', business_name: 'Restaurant XYZ' },
  s3: { title: 'Line Cook', business_name: 'Hotel Dublin' },
}

function TimeTrackingPage() {
  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([])
  const [currentShift, setCurrentShift] = useState<{
    clocked_in: boolean
    shift_id?: string
    clock_record?: ClockRecord
  } | null>(null)
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00')
  const [loading, setLoading] = useState(true)
  const [clockingOut, setClockingOut] = useState(false)

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [records, shift] = await Promise.all([
          mockApi.time.getRecords(),
          mockApi.time.getCurrentShift(),
        ])
        setClockRecords(records)
        setCurrentShift(shift)
      } catch (error) {
        // Error handled silently
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Update elapsed time every second when clocked in
  useEffect(() => {
    if (!currentShift?.clocked_in || !currentShift.clock_record?.clock_in) {
      return
    }

    const updateElapsed = () => {
      const clockInTime = new Date(currentShift.clock_record!.clock_in!).getTime()
      const now = Date.now()
      const diff = now - clockInTime

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [currentShift])

  const handleClockOut = async () => {
    if (!currentShift?.shift_id) return

    setClockingOut(true)
    try {
      const record = await mockApi.time.clockOut(currentShift.shift_id)
      setClockRecords((prev) => [record, ...prev])
      setCurrentShift({ clocked_in: false })
      setElapsedTime('00:00:00')
    } catch (error) {
      // Error handled silently
    } finally {
      setClockingOut(false)
    }
  }

  const getStatusBadge = (status: ClockRecord['status']) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        )
      case 'disputed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Disputed
          </Badge>
        )
      case 'pending':
      case 'clocked_out':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'clocked_in':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Play className="h-3 w-3" />
            In Progress
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatClockTime = (isoString?: string) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-IE', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatRecordDate = (isoString: string) => {
    return formatDate(isoString)
  }

  // Calculate weekly total hours
  const getWeeklyHours = () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
    startOfWeek.setHours(0, 0, 0, 0)

    const weeklyRecords = clockRecords.filter((record) => {
      const recordDate = new Date(record.created_at)
      return recordDate >= startOfWeek && record.total_hours
    })

    const totalHours = weeklyRecords.reduce((sum, record) => sum + (record.total_hours || 0), 0)
    return totalHours.toFixed(2)
  }

  const getShiftDetails = (shiftId: string) => {
    return mockShiftDetails[shiftId] || { title: 'Unknown Shift', business_name: 'Unknown Business' }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Time Tracking</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Time Tracking</h1>
        <p className="text-muted-foreground">Track your clock-in and clock-out times</p>
      </div>

      {/* Current Shift Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Shift Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentShift?.clocked_in && currentShift.clock_record ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {getShiftDetails(currentShift.shift_id || '').title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @ {getShiftDetails(currentShift.shift_id || '').business_name}
                  </p>
                </div>
                <Badge variant="default" className="flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  Clocked In
                </Badge>
              </div>

              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Elapsed Time</p>
                <p className="text-4xl font-mono font-bold text-brand-600">{elapsedTime}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Started at {formatClockTime(currentShift.clock_record.clock_in)}
                </p>
              </div>

              <Button
                onClick={handleClockOut}
                disabled={clockingOut}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <Square className="mr-2 h-4 w-4" />
                {clockingOut ? 'Clocking Out...' : 'Clock Out'}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">No Active Shift</p>
              <p className="text-sm text-muted-foreground mt-1">
                You are not currently clocked in to any shift
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Hours This Week</p>
              <p className="text-3xl font-bold text-brand-600">{getWeeklyHours()} hrs</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Shifts Completed</p>
              <p className="text-3xl font-bold">
                {clockRecords.filter((r) => r.status === 'approved' || r.status === 'clocked_out').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clock Records History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clock Records History</CardTitle>
        </CardHeader>
        <CardContent>
          {clockRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No clock records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Shift
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Clock In
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Clock Out
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Total Hours
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clockRecords.map((record) => {
                    const shiftDetails = getShiftDetails(record.shift_id)
                    return (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="py-3 px-2 text-sm">
                          {formatRecordDate(record.created_at)}
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="text-sm font-medium">{shiftDetails.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {shiftDetails.business_name}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {formatClockTime(record.clock_in)}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {formatClockTime(record.clock_out)}
                        </td>
                        <td className="py-3 px-2 text-sm font-medium">
                          {record.total_hours ? `${record.total_hours.toFixed(2)} hrs` : '-'}
                        </td>
                        <td className="py-3 px-2">{getStatusBadge(record.status)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
