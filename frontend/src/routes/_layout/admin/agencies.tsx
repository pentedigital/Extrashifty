import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, MoreVertical, Eye, Users, Building2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useAdminAgencies } from '@/hooks/api/useAdminApi'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_layout/admin/agencies')({
  component: AdminAgenciesPage,
})

function AdminAgenciesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { addToast } = useToast()

  // Fetch agencies from API
  const { data: agenciesData, isLoading, error } = useAdminAgencies({
    search: searchQuery || undefined,
  })

  // Process agencies for display
  const agencies = useMemo(() => {
    if (!agenciesData?.items) return []
    return agenciesData.items.map(agency => ({
      id: String(agency.id),
      name: agency.agency_name || 'Unknown',
      status: agency.is_verified ? 'verified' : 'pending',
      email: agency.business_email || '',
      staffCount: agency.total_staff || 0,
      clientCount: 0, // Would need additional data
      mode: 'Staff Provider',
    }))
  }, [agenciesData])

  // Filter agencies client-side
  const filteredAgencies = agencies.filter(agency =>
    searchQuery === '' ||
    agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agency.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleViewAgency = (name: string) => {
    addToast({
      type: 'info',
      title: 'Opening agency details',
      description: `Loading details for ${name}.`,
    })
  }

  const handleExportAgencies = () => {
    addToast({
      type: 'success',
      title: 'Export started',
      description: 'Agencies data export has been initiated.',
    })
  }

  const handleMoreOptions = (name: string) => {
    addToast({
      type: 'info',
      title: 'More options',
      description: `Additional options for ${name}.`,
    })
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
        <div>
          <h1 className="text-2xl font-bold">Agencies</h1>
          <p className="text-muted-foreground">Manage staffing agencies</p>
        </div>
        <EmptyState
          icon={Search}
          title="Unable to load agencies"
          description="There was an error loading agencies. Please try again later."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': return <Badge variant="success">Verified</Badge>
      case 'pending': return <Badge variant="warning">Pending</Badge>
      case 'suspended': return <Badge variant="destructive">Suspended</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agencies</h1>
        <p className="text-muted-foreground">Manage staffing agencies</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportAgencies}>Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredAgencies.map((agency) => (
              <div
                key={agency.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>{agency.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{agency.name}</p>
                      {getStatusBadge(agency.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{agency.mode} • {agency.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {agency.staffCount} staff
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {agency.clientCount} clients
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View details"
                      onClick={() => handleViewAgency(agency.name)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoreOptions(agency.name)}
                    >
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
