import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, MoreVertical, Eye, Users, Building2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export const Route = createFileRoute('/_layout/admin/agencies')({
  component: AdminAgenciesPage,
})

const mockAgencies = [
  { id: '1', name: 'Dublin Staffing Solutions', status: 'verified', email: 'info@dublinstaffing.ie', staffCount: 45, clientCount: 12, mode: 'Full Intermediary' },
  { id: '2', name: 'Cork Hospitality Services', status: 'verified', email: 'contact@corkhs.ie', staffCount: 28, clientCount: 8, mode: 'Staff Provider' },
  { id: '3', name: 'Galway Temps', status: 'pending', email: 'admin@galwaytemps.ie', staffCount: 0, clientCount: 0, mode: 'Staff Provider' },
  { id: '4', name: 'Premier Staff Ireland', status: 'verified', email: 'hr@premierstaff.ie', staffCount: 89, clientCount: 24, mode: 'Full Intermediary' },
  { id: '5', name: 'Quick Staff Dublin', status: 'suspended', email: 'support@quickstaff.ie', staffCount: 15, clientCount: 3, mode: 'Staff Provider' },
]

function AdminAgenciesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { addToast } = useToast()

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

  const filteredAgencies = mockAgencies.filter(agency =>
    agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agency.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
