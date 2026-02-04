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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import type { Shift } from '@/types/shift'

export const Route = createFileRoute('/_layout/marketplace/$shiftId')({
  component: ShiftDetailPage,
})

// Mock data - would come from API
const mockShift: Shift = {
  id: '1',
  company_id: 'b1',
  title: 'Bartender - Friday Night',
  description: `We're looking for an experienced bartender to join us for a busy Friday night at Dublin's oldest pub!

Requirements:
- 2+ years bartending experience
- Knowledge of classic and modern cocktails
- RSA certification
- Ability to work in a fast-paced environment
- Excellent customer service skills

You'll be working alongside our regular team and serving a mix of locals and tourists. Tips are shared at the end of the night.`,
  shift_type: 'bar',
  date: '2026-02-07',
  start_time: '18:00',
  end_time: '00:00',
  duration_hours: 6,
  location_name: 'The Brazen Head',
  address: '20 Bridge Street Lower, Dublin 8',
  city: 'Dublin',
  hourly_rate: 18,
  total_pay: 108,
  currency: 'EUR',
  spots_total: 1,
  spots_filled: 0,
  required_skills: ['Bartending', 'Cocktails', 'Wine Service', 'Customer Service'],
  status: 'open',
  created_at: '2026-02-04T10:00:00Z',
  updated_at: '2026-02-04T10:00:00Z',
  company: {
    id: 'b1',
    company_name: 'The Brazen Head',
    company_type: 'bar',
    city: 'Dublin',
    is_verified: true,
    average_rating: 4.8,
    review_count: 124,
  },
}

function ShiftDetailPage() {
  const { shiftId } = Route.useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false)
  const [coverMessage, setCoverMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // In real app, fetch shift by ID
  const shift = mockShift

  const handleApply = async () => {
    setIsSubmitting(true)
    try {
      // TODO: Call API to create application
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsApplyDialogOpen(false)
      addToast({
        type: 'success',
        title: 'Application submitted!',
        description: `Your application for "${shift.title}" has been sent. We'll notify you when the company responds.`,
      })
      navigate({ to: '/shifts/applications' })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to submit application',
        description: 'Please try again or contact support if the problem persists.',
      })
    } finally {
      setIsSubmitting(false)
    }
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
                      <Badge variant="success">Open</Badge>
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
              >
                Apply Now
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
            <Button onClick={handleApply} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
