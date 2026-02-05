import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, MoreVertical, Eye, MapPin, Clock, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useAdminShifts } from '@/hooks/api/useAdminApi'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_layout/admin/shifts')({
  component: AdminShiftsPage,
})

function AdminShiftsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Fetch shifts from API
  const { data: shiftsData, isLoading, error } = useAdminShifts({
    search: searchQuery || undefined,
    status: activeTab !== 'all' ? activeTab : undefined,
  })

  // Process shifts for display
  const shifts = useMemo(() => {
    if (!shiftsData?.items) return []
    return shiftsData.items.map(shift => ({
      id: String(shift.id),
      title: shift.title || 'Untitled Shift',
      company: shift.company_name || 'Unknown Company',
      location: shift.location || 'Unknown Location',
      date: shift.date || '',
      startTime: shift.start_time || '',
      endTime: shift.end_time || '',
      rate: shift.hourly_rate || 0,
      status: shift.status || 'active',
      applicants: shift.applicant_count || 0,
    }))
  }, [shiftsData])

  // Filter shifts client-side
  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = searchQuery === '' ||
      shift.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.company.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || shift.status === activeTab
    return matchesSearch && matchesTab
  })

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
        <div>
          <h1 className="text-2xl font-bold">Shifts</h1>
          <p className="text-muted-foreground">Monitor all platform shifts</p>
        </div>
        <EmptyState
          icon={Search}
          title="Unable to load shifts"
          description="There was an error loading shifts. Please try again later."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      </div>
    )
  }

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
      <div>
        <h1 className="text-2xl font-bold">Shifts</h1>
        <p className="text-muted-foreground">Monitor all platform shifts</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="filled">Filled</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{shift.title}</p>
                    {getStatusBadge(shift.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{shift.company}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {shift.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(shift.date)} {formatTime(shift.startTime)}-{formatTime(shift.endTime)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden md:block text-right">
                    <p className="font-medium">{formatCurrency(shift.rate)}/hr</p>
                    <p className="text-sm text-muted-foreground">{shift.applicants} applicants</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="View details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
