import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowLeft, Edit, MapPin, Clock, Euro, Users, Calendar, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useShift } from '@/hooks/api/useShiftsApi'
import type { ShiftStatus } from '@/types/shift'

export const Route = createFileRoute('/_layout/company/shifts/$shiftId/')({
  component: ShiftDetailsPage,
})

function ShiftDetailsPage() {
  const { shiftId } = Route.useParams()

  // Fetch shift data
  const { data: shift, isLoading, error } = useShift(shiftId)

  const getStatusBadge = (status: ShiftStatus) => {
    switch (status) {
      case 'open': return <Badge variant="success">Open</Badge>
      case 'assigned': return <Badge variant="success">Assigned</Badge>
      case 'in_progress': return <Badge variant="warning">In Progress</Badge>
      case 'completed': return <Badge variant="secondary">Completed</Badge>
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>
      case 'draft': return <Badge variant="outline">Draft</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !shift) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/company/shifts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Shift Details</h1>
        </div>
        <EmptyState
          icon={AlertCircle}
          title="Shift not found"
          description="This shift may have been removed or you don't have permission to view it."
        />
      </div>
    )
  }

  // Calculate duration
  const calculateDuration = () => {
    if (!shift.start_time || !shift.end_time) return 0
    const [startH, startM] = shift.start_time.split(':').map(Number)
    const [endH, endM] = shift.end_time.split(':').map(Number)
    let duration = (endH * 60 + endM) - (startH * 60 + startM)
    if (duration < 0) duration += 24 * 60 // Overnight shift
    return duration / 60
  }

  const durationHours = shift.duration_hours || calculateDuration()
  const totalCost = shift.hourly_rate * durationHours * shift.spots_total

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/company/shifts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{shift.title}</h1>
            {getStatusBadge(shift.status)}
          </div>
          <p className="text-muted-foreground">{shift.location_name}, {shift.city}</p>
        </div>
        <Link to={`/company/shifts/${shiftId}/edit`}>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Shift
          </Button>
        </Link>
        {shift.status === 'open' && (
          <Link to={`/company/shifts/${shiftId}/applicants`}>
            <Button>
              <Users className="mr-2 h-4 w-4" />
              View Applicants
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shift Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(shift.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{shift.location_name}</p>
                    {shift.address && <p className="text-sm text-muted-foreground">{shift.address}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Euro className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate</p>
                    <p className="font-medium">{formatCurrency(shift.hourly_rate)}/hr</p>
                  </div>
                </div>
              </div>
              {shift.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="whitespace-pre-line">{shift.description}</p>
                </div>
              )}
              {shift.required_skills && shift.required_skills.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {shift.required_skills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Positions */}
          <Card>
            <CardHeader>
              <CardTitle>Positions ({shift.spots_filled}/{shift.spots_total})</CardTitle>
            </CardHeader>
            <CardContent>
              {shift.spots_filled > 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {shift.spots_filled} of {shift.spots_total} positions filled
                </p>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No positions filled yet. View applicants to start hiring.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(shift.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Positions</span>
                <span className="font-medium">{shift.spots_filled}/{shift.spots_total} filled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{durationHours} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-medium">{formatCurrency(totalCost)}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee (10%)</span>
                  <span className="font-medium">{formatCurrency(totalCost * 0.1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Created</p>
              <p className="font-medium">{formatDate(shift.created_at)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
