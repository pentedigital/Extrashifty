import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Euro,
  Users,
  Building2,
  Search,
  Star,
  CheckCircle,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export const Route = createFileRoute('/_layout/agency/shifts/$shiftId/assign')({
  component: AssignStaffPage,
})

// Mock shift data
const mockShift = {
  id: '2',
  title: 'Server',
  client: { id: '2', name: 'Cafe Central' },
  date: '2026-02-05',
  startTime: '09:00',
  endTime: '17:00',
  hourlyRate: 15,
  location: 'Grafton Street, Dublin 2',
  spotsTotal: 3,
  spotsFilled: 2,
  status: 'open',
  description:
    'Looking for experienced servers to handle lunch and dinner service. Must be familiar with POS systems and have excellent customer service skills.',
  requirements: ['Food handling certificate', 'Min 1 year experience', 'English fluency'],
  assignedStaff: [
    { id: '3', name: 'Tom Wilson' },
    { id: '4', name: 'Sarah Chen' },
  ],
}

// Mock available agency staff
const mockAvailableStaff = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@email.com',
    skills: ['Bartending', 'Server', 'Customer Service'],
    rating: 4.9,
    shiftsCompleted: 48,
    isAvailable: true,
    verifications: { idVerified: true, backgroundCheck: true },
  },
  {
    id: '5',
    name: 'Ali Hassan',
    email: 'ali.hassan@email.com',
    skills: ['Kitchen Porter', 'Server', 'Cleaning'],
    rating: 4.7,
    shiftsCompleted: 23,
    isAvailable: true,
    verifications: { idVerified: true, backgroundCheck: true },
  },
  {
    id: '6',
    name: 'James Murphy',
    email: 'james.murphy@email.com',
    skills: ['Line Cook', 'Server', 'Food Prep'],
    rating: 4.8,
    shiftsCompleted: 35,
    isAvailable: true,
    verifications: { idVerified: true, backgroundCheck: false },
  },
  {
    id: '7',
    name: 'Emma OBrien',
    email: 'emma.obrien@email.com',
    skills: ['Server', 'Hostess', 'Barista'],
    rating: 4.6,
    shiftsCompleted: 19,
    isAvailable: false,
    verifications: { idVerified: true, backgroundCheck: true },
  },
  {
    id: '8',
    name: 'Liam Kelly',
    email: 'liam.kelly@email.com',
    skills: ['Server', 'Bartending', 'Wine Service'],
    rating: 4.9,
    shiftsCompleted: 67,
    isAvailable: true,
    verifications: { idVerified: true, backgroundCheck: true },
  },
]

function AssignStaffPage() {
  const { shiftId } = Route.useParams()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true)

  // Guard against missing shiftId
  if (!shiftId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Shift not found</h1>
        <p className="text-muted-foreground">Invalid shift ID.</p>
      </div>
    )
  }

  const shift = mockShift
  const spotsRemaining = shift.spotsTotal - shift.spotsFilled

  // Filter staff based on search and availability
  const filteredStaff = mockAvailableStaff.filter((staff) => {
    // Filter by availability if enabled
    if (showOnlyAvailable && !staff.isAvailable) {
      return false
    }

    // Filter out already assigned staff
    if (shift.assignedStaff.some((assigned) => assigned.id === staff.id)) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        staff.name.toLowerCase().includes(query) ||
        staff.email.toLowerCase().includes(query) ||
        staff.skills.some((skill) => skill.toLowerCase().includes(query))
      )
    }

    return true
  })

  const handleToggleStaffSelection = (staffId: string) => {
    setSelectedStaff((prev) => {
      if (prev.includes(staffId)) {
        return prev.filter((id) => id !== staffId)
      }
      // Check if we can add more staff
      if (prev.length >= spotsRemaining) {
        addToast({
          type: 'warning',
          title: 'Maximum reached',
          description: `Only ${spotsRemaining} position(s) remaining for this shift.`,
        })
        return prev
      }
      return [...prev, staffId]
    })
  }

  const handleAssignStaff = () => {
    if (selectedStaff.length === 0) {
      addToast({
        type: 'warning',
        title: 'No staff selected',
        description: 'Please select at least one staff member to assign.',
      })
      return
    }

    const staffNames = selectedStaff
      .map((id) => mockAvailableStaff.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(', ')

    addToast({
      type: 'success',
      title: 'Staff assigned',
      description: `Successfully assigned ${staffNames} to ${shift.title} at ${shift.client.name}.`,
    })

    // In real implementation, this would make an API call
    setSelectedStaff([])
  }

  const handleSelectAll = () => {
    const availableToSelect = filteredStaff.slice(0, spotsRemaining).map((s) => s.id)
    setSelectedStaff(availableToSelect)
  }

  const handleClearSelection = () => {
    setSelectedStaff([])
  }

  return (
    <div className="space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center gap-4">
        <Link to="/agency/shifts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Assign Staff to Shift</h1>
          <p className="text-muted-foreground">
            Select staff members to assign to this shift
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Shift Details Summary */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Shift Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{shift.title}</h3>
              <Link
                to={`/agency/clients/${shift.client.id}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                {shift.client.name}
              </Link>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(shift.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                </span>
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

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Positions</span>
                <Badge variant={spotsRemaining > 0 ? 'warning' : 'success'}>
                  {shift.spotsFilled}/{shift.spotsTotal} Filled
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {spotsRemaining > 0
                  ? `${spotsRemaining} position(s) still need to be filled`
                  : 'All positions have been filled'}
              </p>
            </div>

            {shift.assignedStaff.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Already Assigned</p>
                <div className="flex flex-wrap gap-2">
                  {shift.assignedStaff.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md"
                    >
                      <Avatar size="xs">
                        <AvatarFallback className="text-xs">
                          {staff.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{staff.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {shift.requirements && shift.requirements.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Requirements</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {shift.requirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name, email, or skills..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={showOnlyAvailable}
                      onCheckedChange={(checked) =>
                        setShowOnlyAvailable(checked === true)
                      }
                    />
                    Available only
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selection actions */}
          {filteredStaff.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {selectedStaff.length} of {spotsRemaining} positions selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All ({Math.min(filteredStaff.length, spotsRemaining)})
                </Button>
                {selectedStaff.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearSelection}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Staff list */}
          {filteredStaff.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No available staff"
              description={
                searchQuery
                  ? 'No staff members match your search criteria.'
                  : showOnlyAvailable
                    ? 'No available staff members found. Try disabling the availability filter.'
                    : 'No staff members available for this shift.'
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((staff) => {
                const isSelected = selectedStaff.includes(staff.id)
                return (
                  <Card
                    key={staff.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:shadow-md'
                    } ${!staff.isAvailable ? 'opacity-60' : ''}`}
                    onClick={() => handleToggleStaffSelection(staff.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleStaffSelection(staff.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar>
                          <AvatarFallback>
                            {staff.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{staff.name}</h3>
                            {!staff.isAvailable && (
                              <Badge variant="secondary">Busy</Badge>
                            )}
                            {staff.verifications.idVerified &&
                              staff.verifications.backgroundCheck && (
                                <Badge variant="outline" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Verified
                                </Badge>
                              )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {staff.email}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {staff.skills.slice(0, 4).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {staff.skills.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{staff.skills.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-medium">{staff.rating}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {staff.shiftsCompleted} shifts
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Assign button */}
          <div className="flex justify-end gap-3 pt-4">
            <Link to="/agency/shifts">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              onClick={handleAssignStaff}
              disabled={selectedStaff.length === 0 || spotsRemaining === 0}
            >
              Assign {selectedStaff.length > 0 ? `(${selectedStaff.length})` : ''} Staff
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
