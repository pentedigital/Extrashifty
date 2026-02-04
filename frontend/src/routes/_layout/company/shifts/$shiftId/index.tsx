import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Edit, MapPin, Clock, Euro, Users, Calendar, Star } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export const Route = createFileRoute('/_layout/company/shifts/$shiftId/')({
  component: ShiftDetailsPage,
})

const mockShift = {
  id: '1',
  title: 'Bartender',
  description: 'Looking for an experienced bartender for a busy Friday night shift. Must have cocktail experience and be able to work in a fast-paced environment.',
  date: '2026-02-07',
  startTime: '18:00',
  endTime: '00:00',
  hourlyRate: 18,
  location: 'Temple Bar, Dublin 2',
  spotsTotal: 2,
  spotsFilled: 1,
  status: 'active',
  requirements: ['2+ years bartending experience', 'Cocktail knowledge', 'RSA certification'],
  assignedWorkers: [
    { id: '1', name: 'John D.', rating: 4.9, shiftsCompleted: 48, avatar: null }
  ],
  createdAt: '2026-02-01',
}

function ShiftDetailsPage() {
  const { shiftId } = Route.useParams()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default">Active</Badge>
      case 'filled': return <Badge variant="success">Filled</Badge>
      case 'completed': return <Badge variant="secondary">Completed</Badge>
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

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
            <h1 className="text-2xl font-bold">{mockShift.title}</h1>
            {getStatusBadge(mockShift.status)}
          </div>
          <p className="text-muted-foreground">Shift #{shiftId}</p>
        </div>
        <Link to={`/company/shifts/${shiftId}/edit`}>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Shift
          </Button>
        </Link>
        <Link to={`/company/shifts/${shiftId}/applicants`}>
          <Button>
            <Users className="mr-2 h-4 w-4" />
            View Applicants
          </Button>
        </Link>
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
                    <p className="font-medium">{formatDate(mockShift.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">{formatTime(mockShift.startTime)} - {formatTime(mockShift.endTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{mockShift.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Euro className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate</p>
                    <p className="font-medium">{formatCurrency(mockShift.hourlyRate)}/hr</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Description</p>
                <p>{mockShift.description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Requirements</p>
                <ul className="list-disc list-inside space-y-1">
                  {mockShift.requirements.map((req, idx) => (
                    <li key={idx} className="text-sm">{req}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Workers */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned Workers ({mockShift.spotsFilled}/{mockShift.spotsTotal})</CardTitle>
            </CardHeader>
            <CardContent>
              {mockShift.assignedWorkers.length > 0 ? (
                <div className="space-y-3">
                  {mockShift.assignedWorkers.map((worker) => (
                    <div key={worker.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{worker.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{worker.name}</p>
                          <p className="text-sm text-muted-foreground">{worker.shiftsCompleted} shifts completed</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{worker.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No workers assigned yet</p>
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
                {getStatusBadge(mockShift.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spots</span>
                <span className="font-medium">{mockShift.spotsFilled}/{mockShift.spotsTotal} filled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">6 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-medium">{formatCurrency(mockShift.hourlyRate * 6 * mockShift.spotsTotal)}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee (10%)</span>
                  <span className="font-medium">{formatCurrency(mockShift.hourlyRate * 6 * mockShift.spotsTotal * 0.1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Created</p>
              <p className="font-medium">{formatDate(mockShift.createdAt)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
