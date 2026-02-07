import { useState, useMemo, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { UserPlus, Search, Users, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Star } from 'lucide-react'
import { useAgencyStaff } from '@/hooks/api/useAgencyApi'

export const Route = createFileRoute('/_layout/agency/staff/')({
  component: StaffPoolPage,
})

interface StaffMember {
  id: string
  name: string
  avatar: string | null
  skills: string[]
  rating: number
  shifts_completed: number
  is_available: boolean
  status: string
}

function StaffPoolPage() {
  const [activeTab, setActiveTab] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch staff with status filter
  const { data: activeStaffData, isLoading: activeLoading, error: activeError } = useAgencyStaff({ status: 'active' })
  const { data: pendingStaffData, isLoading: pendingLoading } = useAgencyStaff({ status: 'pending' })
  const { data: inactiveStaffData, isLoading: inactiveLoading } = useAgencyStaff({ status: 'inactive' })

  // Transform API data to display format
  const transformStaffData = useCallback((items: NonNullable<typeof activeStaffData>['items'] | undefined): StaffMember[] => {
    if (!items) return []
    return items.map((member) => ({
      id: member.id,
      name: member.staff?.full_name ?? `Staff Member ${member.staff_id}`,
      avatar: member.staff?.avatar_url ?? null,
      skills: member.staff?.skills ?? [],
      rating: member.staff?.average_rating ?? 0,
      shifts_completed: member.shifts_completed,
      is_available: member.is_available,
      status: member.status,
    }))
  }, [])

  const activeStaff = useMemo(() => transformStaffData(activeStaffData?.items), [activeStaffData, transformStaffData])
  const pendingStaff = useMemo(() => transformStaffData(pendingStaffData?.items), [pendingStaffData, transformStaffData])
  const inactiveStaff = useMemo(() => transformStaffData(inactiveStaffData?.items), [inactiveStaffData, transformStaffData])

  const getStatusBadge = (status: string, isAvailable?: boolean) => {
    if (status === 'pending') return <Badge variant="warning">Pending</Badge>
    if (status === 'inactive') return <Badge variant="secondary">Inactive</Badge>
    if (isAvailable) return <Badge variant="success">Available</Badge>
    return <Badge variant="outline">Busy</Badge>
  }

  const filteredStaff = (staff: StaffMember[]) => {
    if (!searchQuery) return staff
    const query = searchQuery.toLowerCase()
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.skills.some((skill) => skill.toLowerCase().includes(query))
    )
  }

  const renderStaffList = (staff: StaffMember[], isLoading: boolean, error?: Error | null) => {
    if (isLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[140px]" />
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <p>Failed to load staff members. Please try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )
    }

    const filtered = filteredStaff(staff)

    if (filtered.length === 0) {
      if (searchQuery) {
        return (
          <EmptyState
            icon={Search}
            title="No results"
            description="No staff members match your search. Try different keywords."
          />
        )
      }
      return (
        <EmptyState
          icon={Users}
          title="No staff members"
          description={
            activeTab === 'active'
              ? "You haven't added any staff yet. Invite freelancers to join your agency."
              : `No ${activeTab} staff members.`
          }
          action={
            activeTab === 'active' || activeTab === 'pending' ? (
              <Link to="/agency/staff/invite">
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Staff
                </Button>
              </Link>
            ) : undefined
          }
        />
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((member) => (
          <Link key={member.id} to={`/agency/staff/${member.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar size="lg">
                      {member.avatar && <AvatarImage src={member.avatar} />}
                      <AvatarFallback>
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {member.status === 'active' && (
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${
                          member.is_available ? 'bg-success/50' : 'bg-muted-foreground'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{member.name}</p>
                      {getStatusBadge(member.status, member.is_available)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      {member.rating > 0 && (
                        <>
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          <span>{member.rating}</span>
                          <span>-</span>
                        </>
                      )}
                      <span>{member.shifts_completed} shifts</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {member.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    )
  }

  const isAnyLoading = activeLoading || pendingLoading || inactiveLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Pool</h1>
          <p className="text-muted-foreground">
            Manage your agency's staff members
          </p>
        </div>
        <Link to="/agency/staff/invite">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Staff
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or skill..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active {isAnyLoading ? '' : `(${activeStaff.length})`}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending {isAnyLoading ? '' : `(${pendingStaff.length})`}
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive {isAnyLoading ? '' : `(${inactiveStaff.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {renderStaffList(activeStaff, activeLoading, activeError)}
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          {renderStaffList(pendingStaff, pendingLoading)}
        </TabsContent>
        <TabsContent value="inactive" className="mt-6">
          {renderStaffList(inactiveStaff, inactiveLoading)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
