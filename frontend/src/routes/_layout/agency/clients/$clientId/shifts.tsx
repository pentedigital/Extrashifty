import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowLeft, Plus, Search, Calendar, MapPin, Clock, Euro, Users, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getShiftStatusBadge } from '@/lib/badgeUtils'
import { useClientShifts, useAgencyClients } from '@/hooks/api/useAgencyApi'

export const Route = createFileRoute('/_layout/agency/clients/$clientId/shifts')({
  component: ClientShiftsPage,
})

// Type for client shift display
interface ClientShiftDisplay {
  id: string
  title: string
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

function ClientShiftsPage() {
  const { clientId } = Route.useParams()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const { addToast } = useToast()

  // Fetch client data and shifts
  const { data: clientsData } = useAgencyClients()
  const { data: shiftsData, isLoading, error } = useClientShifts(clientId || '')

  // Find the client from the clients list
  const client = useMemo(() => {
    if (!clientsData?.items) return { id: clientId || '', name: 'Unknown Client' }
    const found = clientsData.items.find((c: { id?: string | number }) => String(c.id) === clientId)
    if (found) {
      return {
        id: String(found.id),
        name: found.company?.business_name || found.business_email || 'Unknown Client',
      }
    }
    return { id: clientId || '', name: 'Unknown Client' }
  }, [clientsData, clientId])

  // Process shifts into categorized lists
  const categorizedShifts = useMemo(() => {
    const result: {
      upcoming: ClientShiftDisplay[]
      completed: ClientShiftDisplay[]
    } = {
      upcoming: [],
      completed: [],
    }

    if (!shiftsData || !Array.isArray(shiftsData)) return result

    for (const shift of shiftsData as Array<{
      id?: string | number
      title?: string
      date?: string
      start_time?: string
      end_time?: string
      hourly_rate?: number
      location?: string
      spots_total?: number
      spots_filled?: number
      status?: string
      assigned_staff?: Array<{ id?: string | number; name?: string; staff?: { display_name?: string } }>
    }>) {
      const spotsFilled = shift.spots_filled ?? shift.assigned_staff?.length ?? 0
      const spotsTotal = shift.spots_total ?? 1

      const processedShift: ClientShiftDisplay = {
        id: String(shift.id),
        title: shift.title || 'Untitled Shift',
        date: shift.date || '',
        startTime: shift.start_time || '',
        endTime: shift.end_time || '',
        hourlyRate: shift.hourly_rate || 0,
        location: shift.location || '',
        spotsTotal,
        spotsFilled,
        status: (shift.status || '').toLowerCase() === 'completed' ? 'completed' :
                spotsFilled >= spotsTotal ? 'filled' : 'open',
        assignedStaff: (shift.assigned_staff || []).map((s) => ({
          id: String(s.id || ''),
          name: s.name || s.staff?.display_name || 'Unknown',
        })),
      }

      if (processedShift.status === 'completed') {
        result.completed.push(processedShift)
      } else {
        result.upcoming.push(processedShift)
      }
    }

    return result
  }, [shiftsData])

  const handleAssignStaff = (shiftTitle: string, spotsNeeded: number) => {
    addToast({
      type: 'info',
      title: 'Assign staff',
      description: `Opening staff assignment for ${shiftTitle}. ${spotsNeeded} position(s) to fill.`,
    })
  }

  const handleViewDetails = (shiftTitle: string) => {
    addToast({
      type: 'info',
      title: 'Shift details',
      description: `Loading details for ${shiftTitle}.`,
    })
  }

  // Guard against missing clientId
  if (!clientId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Client not found</h1>
        <p className="text-muted-foreground">Invalid client ID.</p>
      </div>
    )
  }

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
        <div className="flex items-center gap-4">
          <Link to={`/agency/clients/${clientId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Error loading shifts</h1>
        </div>
        <EmptyState
          icon={Calendar}
          title="Unable to load shifts"
          description="There was an error loading shifts for this client."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      </div>
    )
  }

  const filteredShifts = (shifts: ClientShiftDisplay[]) => {
    if (!searchQuery) return shifts
    const query = searchQuery.toLowerCase()
    return shifts.filter(
      (s) =>
        s.title?.toLowerCase().includes(query) ||
        s.location?.toLowerCase().includes(query)
    )
  }

  const renderShiftList = (shifts: ClientShiftDisplay[]) => {
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
          description={activeTab === 'upcoming' ? 'No upcoming shifts for this client.' : 'No completed shifts yet.'}
          action={
            activeTab === 'upcoming' ? (
              <Link to="/agency/shifts/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Shift
                </Button>
              </Link>
            ) : undefined
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
                    {(() => { const badge = getShiftStatusBadge(shift.status, shift.spotsTotal, shift.spotsFilled); return <Badge variant={badge.variant}>{badge.label}</Badge>; })()}
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
                      <span>{shift.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span>{formatCurrency(shift.hourlyRate)}/hr</span>
                    </div>
                  </div>
                  {shift.assignedStaff.length > 0 && (
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
                  )}
                  {shift.assignedStaff.length === 0 && shift.status === 'open' && (
                    <div className="flex items-center gap-2 mt-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-amber-600">
                        {shift.spotsTotal} workers needed
                      </span>
                    </div>
                  )}
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
                    onClick={() => handleViewDetails(shift.title)}
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
      <div className="flex items-center gap-4">
        <Link to={`/agency/clients/${clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{client.name} - Shifts</h1>
          <p className="text-muted-foreground">Manage shifts for this client</p>
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
            placeholder="Search shifts..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({categorizedShifts.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({categorizedShifts.completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {renderShiftList(categorizedShifts.upcoming)}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {renderShiftList(categorizedShifts.completed)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
