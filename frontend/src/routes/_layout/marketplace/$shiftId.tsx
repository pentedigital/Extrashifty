import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Euro,
  CheckCircle,
  Star,
  Calendar,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useShift, useApplyToShift } from '@/hooks/api/useShiftsApi'

export const Route = createFileRoute('/_layout/marketplace/$shiftId')({
  component: ShiftDetailPage,
})

function ShiftDetailPage() {
  const { shiftId } = Route.useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false)
  const [coverMessage, setCoverMessage] = useState('')

  // Fetch shift data
  const { data: shift, isLoading, error } = useShift(shiftId)

  // Application mutation
  const applyToShift = useApplyToShift()

  const handleApply = async () => {
    if (!shift) return

    try {
      await applyToShift.mutateAsync({
        shiftId: shift.id,
        coverMessage: coverMessage || undefined,
      })
      setIsApplyDialogOpen(false)
      addToast({
        type: 'success',
        title: 'Application submitted!',
        description: `Your application for "${shift.title}" has been sent. We'll notify you when the company responds.`,
      })
      navigate({ to: '/shifts/applications' })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to submit application',
        description: 'Please try again or contact support if the problem persists.',
      })
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
        <Link to="/marketplace" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>
        <EmptyState
          icon={AlertCircle}
          title="Shift not found"
          description="This shift may have been removed or is no longer available."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">{shift.title}</h1>
                      <Badge variant={shift.status === 'open' ? 'success' : 'secondary'}>
                        {shift.status === 'open' ? 'Open' : shift.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{shift.location_name}, {shift.address}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>{formatDate(shift.date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>{formatTime(shift.start_time)} - {formatTime(shift.end_time)} ({shift.duration_hours} hours)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Euro className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{formatCurrency(shift.hourly_rate)}/hour</span>
                  </div>
                  {shift.spots_total > 1 && (
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span>{shift.spots_total - shift.spots_filled} spots available</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-muted-foreground">
                {shift.description}
              </p>
            </CardContent>
          </Card>

          {/* Requirements */}
          {shift.required_skills && shift.required_skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {shift.required_skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Card */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Apply for this Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-brand-600">
                    {formatCurrency(shift.hourly_rate)}
                  </span>
                  <span className="text-muted-foreground">/hour</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {shift.duration_hours} hours ({formatCurrency(shift.total_pay)} total)
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => setIsApplyDialogOpen(true)}
                disabled={shift.status !== 'open'}
              >
                {shift.status === 'open' ? 'Apply Now' : 'Not Available'}
              </Button>
            </CardContent>
          </Card>

          {/* Company Card */}
          {shift.company && (
            <Card>
              <CardHeader>
                <CardTitle>About the Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback>
                      {shift.company.company_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{shift.company.company_name}</p>
                      {shift.company.is_verified && (
                        <CheckCircle className="h-4 w-4 text-brand-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {shift.company.company_type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{shift.company.average_rating}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ({shift.company.review_count} reviews)
                  </span>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/profile/${shift.company.id}`}>View Profile</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {shift.title}</DialogTitle>
            <DialogDescription>
              Add a message to stand out from other applicants (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cover_message">Cover Message</Label>
              <Textarea
                id="cover_message"
                placeholder="Introduce yourself and explain why you're a great fit for this shift..."
                rows={4}
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">Shift Summary</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>{formatDate(shift.date)} • {formatTime(shift.start_time)} - {formatTime(shift.end_time)}</li>
                <li>{shift.location_name}, {shift.city}</li>
                <li className="font-medium text-brand-600">{formatCurrency(shift.hourly_rate)}/hour ({formatCurrency(shift.total_pay)} total)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={applyToShift.isPending}>
              {applyToShift.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
