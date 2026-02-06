import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Star, Users, Search, X, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import {
  usePreferredAgencies,
  useBrowseAgencies,
  useAddPreferredAgency,
  useRemovePreferredAgency,
} from '@/hooks/api/useCompanyApi'

export const Route = createFileRoute('/_layout/company/agencies')({
  component: CompanyAgenciesPage,
})

function CompanyAgenciesPage() {
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch data from API
  const { data: preferredData, isLoading: preferredLoading, error: preferredError } = usePreferredAgencies()
  const { data: browseData, isLoading: browseLoading } = useBrowseAgencies({ search: searchQuery || undefined })

  // Mutations
  const addAgencyMutation = useAddPreferredAgency()
  const removeAgencyMutation = useRemovePreferredAgency()

  // Transform API data
  const preferred = useMemo(() => {
    if (!preferredData?.items) return []
    return preferredData.items.map((a) => ({
      id: String(a.agency_id),
      name: a.agency_name,
      rating: a.rating,
      staffCount: a.staff_count,
      shiftsWithUs: a.shifts_together,
      status: a.status,
    }))
  }, [preferredData])

  const availableAgencies = useMemo(() => {
    if (!browseData?.items) return []
    const preferredIds = new Set(preferred.map((p) => p.id))
    return browseData.items
      .filter((a) => !preferredIds.has(String(a.id)))
      .map((a) => ({
        id: String(a.id),
        name: a.name,
        rating: a.rating,
        staffCount: a.staff_count,
        description: a.description ?? '',
      }))
  }, [browseData, preferred])

  const filteredAvailable = availableAgencies.filter((agency) =>
    agency.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddAgency = (agency: typeof availableAgencies[0]) => {
    addAgencyMutation.mutate(Number(agency.id), {
      onSuccess: () => {
        addToast({
          type: 'success',
          title: 'Agency added',
          description: `${agency.name} has been added to your preferred agencies.`,
        })
      },
      onError: () => {
        addToast({
          type: 'error',
          title: 'Failed to add agency',
          description: 'Please try again later.',
        })
      },
    })
  }

  const handleRemoveAgency = (agencyId: string, agencyName: string) => {
    removeAgencyMutation.mutate(Number(agencyId), {
      onSuccess: () => {
        addToast({
          type: 'info',
          title: 'Agency removed',
          description: `${agencyName} has been removed from your preferred list.`,
        })
      },
      onError: () => {
        addToast({
          type: 'error',
          title: 'Failed to remove agency',
          description: 'Please try again later.',
        })
      },
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
          <CardTitle>Your Preferred Agencies ({preferredLoading ? '-' : preferred.length})</CardTitle>
          <CardDescription>These agencies can apply to your shifts with priority</CardDescription>
        </CardHeader>
        <CardContent>
          {preferredLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : preferredError ? (
            <div className="text-center py-8 text-destructive">
              <AlertCircle className="mx-auto h-12 w-12 mb-3" />
              <p>Failed to load preferred agencies</p>
            </div>
          ) : preferred.length > 0 ? (
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
                    onClick={() => handleRemoveAgency(agency.id, agency.name)}
                    disabled={removeAgencyMutation.isPending}
                  >
                    {removeAgencyMutation.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <X className="mr-1 h-4 w-4" />
                    )}
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

          {browseLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
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
                  <Button
                    size="sm"
                    onClick={() => handleAddAgency(agency)}
                    disabled={addAgencyMutation.isPending}
                  >
                    {addAgencyMutation.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-4 w-4" />
                    )}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
