import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Plus, Star, Users, Search, X } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export const Route = createFileRoute('/_layout/company/agencies')({
  component: CompanyAgenciesPage,
})

const mockPreferredAgencies = [
  { id: '1', name: 'Dublin Staffing Solutions', rating: 4.8, staffCount: 45, shiftsWithUs: 24, status: 'active' },
  { id: '2', name: 'Cork Hospitality Services', rating: 4.6, staffCount: 28, shiftsWithUs: 12, status: 'active' },
]

const mockAvailableAgencies = [
  { id: '3', name: 'Premier Staff Ireland', rating: 4.7, staffCount: 89, description: 'Full-service hospitality staffing' },
  { id: '4', name: 'Galway Temps', rating: 4.5, staffCount: 32, description: 'West Ireland coverage' },
  { id: '5', name: 'Quick Staff Dublin', rating: 4.4, staffCount: 56, description: 'Same-day staffing solutions' },
]

function CompanyAgenciesPage() {
  const { addToast } = useToast()
  const [preferred, setPreferred] = useState(mockPreferredAgencies)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAvailable = mockAvailableAgencies.filter(agency =>
    agency.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !preferred.find(p => p.id === agency.id)
  )

  const handleAddAgency = (agency: typeof mockAvailableAgencies[0]) => {
    setPreferred(prev => [...prev, { ...agency, shiftsWithUs: 0, status: 'active' }])
    addToast({
      type: 'success',
      title: 'Agency added',
      description: `${agency.name} has been added to your preferred agencies.`,
    })
  }

  const handleRemoveAgency = (agencyId: string) => {
    setPreferred(prev => prev.filter(a => a.id !== agencyId))
    addToast({
      type: 'info',
      title: 'Agency removed',
      description: 'The agency has been removed from your preferred list.',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Preferred Agencies</h1>
        <p className="text-muted-foreground">Manage agencies you work with for staffing</p>
      </div>

      {/* Current Preferred Agencies */}
      <Card>
        <CardHeader>
          <CardTitle>Your Preferred Agencies ({preferred.length})</CardTitle>
          <CardDescription>These agencies can apply to your shifts with priority</CardDescription>
        </CardHeader>
        <CardContent>
          {preferred.length > 0 ? (
            <div className="space-y-3">
              {preferred.map((agency) => (
                <div key={agency.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{agency.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{agency.name}</p>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          {agency.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {agency.staffCount} staff
                        </span>
                        <span>{agency.shiftsWithUs} shifts together</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => handleRemoveAgency(agency.id)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No preferred agencies yet</p>
              <p className="text-sm">Add agencies below to give them priority access to your shifts</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Browse Available Agencies */}
      <Card>
        <CardHeader>
          <CardTitle>Browse Agencies</CardTitle>
          <CardDescription>Find and add new agencies to your preferred list</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-3">
            {filteredAvailable.map((agency) => (
              <div key={agency.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>{agency.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{agency.name}</p>
                    <p className="text-sm text-muted-foreground">{agency.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {agency.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {agency.staffCount} staff
                      </span>
                    </div>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAddAgency(agency)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            ))}
            {filteredAvailable.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">
                {searchQuery ? 'No agencies match your search' : 'All available agencies have been added'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
