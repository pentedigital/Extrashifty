import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Star, Calendar, Clock, Phone, Mail, CheckCircle, Shield, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { useAgencyStaffMember, useUpdateStaffAvailability, useRemoveStaff } from '@/hooks/api/useAgencyApi'

export const Route = createFileRoute('/_layout/agency/staff/$memberId')({
  component: StaffMemberDetailsPage,
})

// Type for display data
interface StaffMemberDisplay {
  id: string
  name: string
  email: string
  phone: string
  avatar: string | null
  skills: string[]
  rating: number
  reviewCount: number
  shiftsCompleted: number
  hoursWorked: number
  earnings: number
  joinedAgency: string
  status: string
  isAvailable: boolean
  verifications: {
    idVerified: boolean
    backgroundCheck: boolean
    rightToWork: boolean
  }
  upcomingShifts: Array<{
    id: string
    title: string
    client: string
    date: string
    startTime: string
    endTime: string
    hourlyRate: number
    location: string
  }>
  recentShifts: Array<{
    id: string
    title: string
    client: string
    date: string
    startTime: string
    endTime: string
    hourlyRate: number
    location: string
    rating: number
  }>
}

function StaffMemberDetailsPage() {
  const { memberId } = Route.useParams()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch staff member data
  const { data: staffData, isLoading, error } = useAgencyStaffMember(memberId || '')
  const updateAvailabilityMutation = useUpdateStaffAvailability()
  const removeStaffMutation = useRemoveStaff()

  // Process staff data for display
  const staff: StaffMemberDisplay = useMemo(() => {
    if (!staffData) {
      return {
        id: '',
        name: '',
        email: '',
        phone: '',
        avatar: null,
        skills: [],
        rating: 0,
        reviewCount: 0,
        shiftsCompleted: 0,
        hoursWorked: 0,
        earnings: 0,
        joinedAgency: '',
        status: 'active',
        isAvailable: false,
        verifications: {
          idVerified: false,
          backgroundCheck: false,
          rightToWork: false,
        },
        upcomingShifts: [],
        recentShifts: [],
      }
    }

    return {
      id: String(staffData.id),
      name: staffData.staff?.display_name || staffData.name || 'Unknown',
      email: staffData.staff?.email || staffData.email || '',
      phone: staffData.staff?.phone || staffData.phone || '',
      avatar: staffData.staff?.avatar_url || null,
      skills: staffData.skills || staffData.staff?.skills || [],
      rating: staffData.average_rating || staffData.staff?.average_rating || 0,
      reviewCount: staffData.review_count || 0,
      shiftsCompleted: staffData.shifts_completed || 0,
      hoursWorked: staffData.total_hours || 0,
      earnings: staffData.total_earnings || 0,
      joinedAgency: staffData.joined_at || staffData.created_at || '',
      status: staffData.status || 'active',
      isAvailable: staffData.is_available ?? true,
      verifications: {
        idVerified: staffData.staff?.is_verified ?? false,
        backgroundCheck: staffData.staff?.background_checked ?? false,
        rightToWork: staffData.staff?.right_to_work_verified ?? false,
      },
      upcomingShifts: (staffData.upcoming_shifts || []).map((s: Record<string, unknown>) => ({
        id: String(s.id),
        title: (s.title as string) || '',
        client: (s.client_name as string) || (s.client as { name?: string })?.name || '',
        date: (s.date as string) || '',
        startTime: (s.start_time as string) || '',
        endTime: (s.end_time as string) || '',
        hourlyRate: (s.hourly_rate as number) || 0,
        location: (s.location as string) || '',
      })),
      recentShifts: (staffData.recent_shifts || []).map((s: Record<string, unknown>) => ({
        id: String(s.id),
        title: (s.title as string) || '',
        client: (s.client_name as string) || (s.client as { name?: string })?.name || '',
        date: (s.date as string) || '',
        startTime: (s.start_time as string) || '',
        endTime: (s.end_time as string) || '',
        hourlyRate: (s.hourly_rate as number) || 0,
        location: (s.location as string) || '',
        rating: (s.rating as number) || 0,
      })),
    }
  }, [staffData])

  // Guard against missing memberId
  if (!memberId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Staff member not found</h1>
        <p className="text-muted-foreground">Invalid staff member ID.</p>
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

  if (error || !staffData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/agency/staff">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Staff member not found</h1>
        </div>
        <p className="text-muted-foreground">The requested staff member could not be found.</p>
      </div>
    )
  }

  const handleToggleAvailability = async () => {
    try {
      await updateAvailabilityMutation.mutateAsync({
        staffId: memberId,
        data: { is_available: !staff.isAvailable },
      })
      addToast({
        type: 'success',
        title: staff.isAvailable ? 'Marked as unavailable' : 'Marked as available',
        description: `${staff.name} is now ${staff.isAvailable ? 'unavailable' : 'available'} for shifts.`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to update availability',
        description: 'Please try again.',
      })
    }
  }

  const handleRemoveFromAgency = async () => {
    try {
      await removeStaffMutation.mutateAsync(memberId)
      addToast({
        type: 'info',
        title: 'Staff member removed',
        description: `${staff.name} has been removed from your agency.`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to remove staff member',
        description: 'Please try again.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/agency/staff">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Staff Member Details</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar size="xl">
                  <AvatarFallback className="text-2xl">
                    {staff.name?.split(' ').map((n) => n[0]).join('') ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${
                    staff.isAvailable ? 'bg-success/50' : 'bg-gray-400'
                  }`}
                />
              </div>
              <h2 className="mt-4 text-xl font-semibold">{staff.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={staff.isAvailable ? 'success' : 'secondary'}>
                  {staff.isAvailable ? 'Available' : 'Busy'}
                </Badge>
                {staff.verifications.idVerified && (
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 mt-3">
                <Star className="h-5 w-5 text-warning fill-warning" />
                <span className="font-semibold">{staff.rating}</span>
                <span className="text-muted-foreground">({staff.reviewCount} reviews)</span>
              </div>
              <div className="w-full mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{staff.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{staff.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(staff.joinedAgency)}</span>
                </div>
              </div>
              <div className="w-full mt-6 pt-6 border-t space-y-2">
                <Button className="w-full" onClick={handleToggleAvailability}>
                  {staff.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                </Button>
                <Button variant="outline" className="w-full text-destructive" onClick={handleRemoveFromAgency}>
                  Remove from Agency
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="shifts">Shifts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold">{staff.shiftsCompleted}</p>
                    <p className="text-sm text-muted-foreground">Shifts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold">{staff.hoursWorked}</p>
                    <p className="text-sm text-muted-foreground">Hours</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold">{formatCurrency(staff.earnings)}</p>
                    <p className="text-sm text-muted-foreground">Earned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold">{staff.rating}</p>
                    <p className="text-sm text-muted-foreground">Rating</p>
                  </CardContent>
                </Card>
              </div>

              {/* Verifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Verifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${staff.verifications.idVerified ? 'bg-success/5 border-success/30' : ''}`}>
                      <CheckCircle className={`h-5 w-5 ${staff.verifications.idVerified ? 'text-success' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-sm">ID Verified</p>
                        <p className="text-xs text-muted-foreground">{staff.verifications.idVerified ? 'Confirmed' : 'Pending'}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${staff.verifications.backgroundCheck ? 'bg-success/5 border-success/30' : ''}`}>
                      <CheckCircle className={`h-5 w-5 ${staff.verifications.backgroundCheck ? 'text-success' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-sm">Background Check</p>
                        <p className="text-xs text-muted-foreground">{staff.verifications.backgroundCheck ? 'Passed' : 'Pending'}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${staff.verifications.rightToWork ? 'bg-success/5 border-success/30' : ''}`}>
                      <CheckCircle className={`h-5 w-5 ${staff.verifications.rightToWork ? 'text-success' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-sm">Right to Work</p>
                        <p className="text-xs text-muted-foreground">{staff.verifications.rightToWork ? 'Verified' : 'Pending'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {staff.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shifts" className="mt-6 space-y-6">
              {/* Upcoming Shifts */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Shifts ({staff.upcomingShifts.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {staff.upcomingShifts.length > 0 ? (
                    staff.upcomingShifts.map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{shift.title}</p>
                          <p className="text-sm text-muted-foreground">{shift.client}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(shift.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(shift.hourlyRate)}/hr</p>
                          <Badge variant="default">Confirmed</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No upcoming shifts</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Shifts */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Shifts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {staff.recentShifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{shift.title}</p>
                        <p className="text-sm text-muted-foreground">{shift.client}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(shift.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: shift.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-warning fill-warning" />
                          ))}
                        </div>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
