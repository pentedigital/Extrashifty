import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Search, Calendar, MapPin, Clock, Euro, Users, Building2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export const Route = createFileRoute('/_layout/agency/shifts/')({
  component: AgencyShiftsPage,
})

// Shift type definition for agency shifts
type AgencyShift = {
  id: string
  title: string
  client: { id: string; name: string }
  date: string
  startTime: string
  endTime: string
  hourlyRate: number
  location: string
  spotsTotal: number
  spotsFilled: number
  status: string
  assignedStaff: Array<{ id: string; name: string }>
}

// TODO: Replace with actual API data from useAgencyShifts hook
// Placeholder empty data structure until API integration is complete
const mockShifts: {
  upcoming: AgencyShift[]
  inProgress: AgencyShift[]
  completed: AgencyShift[]
} = {
  upcoming: [],
  inProgress: [],
  completed: [],
}

function AgencyShiftsPage() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const { addToast } = useToast()

  const handleAssignStaff = (shiftTitle: string, spotsNeeded: number) => {
    addToast({
      type: 'info',
      title: 'Assign staff',
      description: `Opening staff assignment for ${shiftTitle}. ${spotsNeeded} position(s) to fill.`,
    })
  }

  const handleViewDetails = (shiftTitle: string, clientName: string) => {
    addToast({
      type: 'info',
      title: 'Shift details',
      description: `Loading details for ${shiftTitle} at ${clientName}.`,
    })
  }

  const getStatusBadge = (status: string, spotsFilled: number, spotsTotal: number) => {
    switch (status) {
      case 'filled':
        return <Badge variant="success">Filled</Badge>
      case 'open':
        return <Badge variant="warning">{spotsFilled}/{spotsTotal} Assigned</Badge>
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredShifts = (shifts: typeof mockShifts.upcoming) => {
    if (!searchQuery) return shifts
    const query = searchQuery.toLowerCase()
    return shifts.filter(
      (s) =>
        s.title?.toLowerCase().includes(query) ||
        s.client?.name?.toLowerCase().includes(query) ||
        s.location?.toLowerCase().includes(query)
    )
  }

  const renderShiftList = (shifts: typeof mockShifts.upcoming) => {
    const filtered = filteredShifts(shifts)

    if (filtered.length === 0) {
      if (searchQuery) {
        return (
          <EmptyState
            icon={Search}
            title="No results"
            description="No shifts match your search."
          />
        )
      }
      return (
        <EmptyState
          icon={Calendar}
          title="No shifts"
          description="No shifts in this category."
          action={
            <Link to="/agency/shifts/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Shift
              </Button>
            </Link>
          }
        />
      )
    }

    return (
      <div className="space-y-4">
        {filtered.map((shift) => (
          <Card key={shift.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{shift.title}</h3>
                    {getStatusBadge(shift.status, shift.spotsFilled, shift.spotsTotal)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Building2 className="h-4 w-4" />
                    <Link to={`/agency/clients/${shift.client.id}`} className="hover:underline">
                      {shift.client.name}
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(shift.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{shift.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span>{formatCurrency(shift.hourlyRate)}/hr</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Assigned:</span>
                    <div className="flex -space-x-2">
                      {shift.assignedStaff.map((staff) => (
                        <Avatar key={staff.id} size="sm" className="border-2 border-background">
                          <AvatarFallback className="text-xs">
                            {staff.name?.split(' ').map((n) => n[0]).join('') ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {shift.spotsFilled < shift.spotsTotal && (
                      <span className="text-sm text-amber-600">
                        +{shift.spotsTotal - shift.spotsFilled} needed
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {shift.status === 'open' && (
                    <Button
                      size="sm"
                      onClick={() => handleAssignStaff(shift.title, shift.spotsTotal - shift.spotsFilled)}
                    >
                      Assign Staff
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(shift.title, shift.client.name)}
                  >
                    View Details
                  </Button>
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
          <h1 className="text-2xl font-bold">Agency Shifts</h1>
          <p className="text-muted-foreground">Manage all shifts for your clients</p>
        </div>
        <Link to="/agency/shifts/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Shift
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search shifts by title, client, or location..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({mockShifts.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="inProgress">
            In Progress ({mockShifts.inProgress.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({mockShifts.completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {renderShiftList(mockShifts.upcoming)}
        </TabsContent>
        <TabsContent value="inProgress" className="mt-6">
          {renderShiftList(mockShifts.inProgress)}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {renderShiftList(mockShifts.completed)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
