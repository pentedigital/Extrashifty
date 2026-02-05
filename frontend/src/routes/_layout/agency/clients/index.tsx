import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Building2, Plus, Search, FileText, Calendar, AlertCircle, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAgencyClients } from '@/hooks/api/useAgencyApi'

export const Route = createFileRoute('/_layout/agency/clients/')({
  component: ClientsPage,
})

interface ClientDisplay {
  id: string
  business_name: string
  business_type: string
  logo: string | null
  rating: number
  shifts_this_month: number
  total_billed: number
  next_shift: string | null
  has_unfilled: boolean
  status: string
}

function ClientsPage() {
  const [activeTab, setActiveTab] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')
  const { addToast } = useToast()

  // Fetch clients from API - for now we fetch all and filter client-side
  // In production, you'd pass the status filter to the backend
  const { data: clientsData, isLoading, error } = useAgencyClients()

  // Transform API data to display format
  const transformClientData = (items: NonNullable<typeof clientsData>['items'] | undefined): ClientDisplay[] => {
    if (!items) return []
    return items.map((client) => ({
      id: client.id,
      business_name: client.company?.business_name ?? client.business_email,
      business_type: client.company?.business_type ?? 'business',
      logo: client.company?.logo_url ?? null,
      rating: client.company?.average_rating ?? 0,
      shifts_this_month: client.shifts_this_month ?? 0,
      total_billed: client.total_billed ?? 0,
      next_shift: null, // Would come from shifts API
      has_unfilled: false, // Would come from shifts API
      status: client.status ?? (client.is_active ? 'active' : 'inactive'),
    }))
  }

  // Filter clients by status
  const allClients = useMemo(() => transformClientData(clientsData?.items), [clientsData])
  const activeClients = useMemo(() => allClients.filter(c => c.status === 'active'), [allClients])
  const pendingClients = useMemo(() => allClients.filter(c => c.status === 'pending'), [allClients])
  const inactiveClients = useMemo(() => allClients.filter(c => c.status === 'inactive'), [allClients])

  const handleReviewClient = (businessName: string) => {
    addToast({
      type: 'info',
      title: 'Review client',
      description: `Opening review process for ${businessName}.`,
    })
  }

  const getStatusBadge = (status: string, hasUnfilled?: boolean) => {
    if (status === 'pending') return <Badge variant="warning">Pending</Badge>
    if (status === 'inactive') return <Badge variant="secondary">Inactive</Badge>
    if (hasUnfilled) return <Badge variant="warning">Unfilled Shifts</Badge>
    return <Badge variant="success">Active</Badge>
  }

  const filteredClients = (clients: ClientDisplay[]) => {
    if (!searchQuery) return clients
    const query = searchQuery.toLowerCase()
    return clients.filter((c) =>
      c.business_name.toLowerCase().includes(query) ||
      c.business_type.toLowerCase().includes(query)
    )
  }

  const renderClientList = (clients: ClientDisplay[], isLoadingTab: boolean, errorTab?: Error | null) => {
    if (isLoadingTab) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
      )
    }

    if (errorTab) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <p>Failed to load clients. Please try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )
    }

    const filtered = filteredClients(clients)

    if (filtered.length === 0) {
      if (searchQuery) {
        return (
          <EmptyState
            icon={Search}
            title="No results"
            description="No clients match your search. Try different keywords."
          />
        )
      }
      return (
        <EmptyState
          icon={Building2}
          title="No clients"
          description={
            activeTab === 'active'
              ? "You haven't added any clients yet. Add your first client to start managing their shifts."
              : `No ${activeTab} clients.`
          }
          action={
            activeTab !== 'inactive' ? (
              <Link to="/agency/clients/add">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </Link>
            ) : undefined
          }
        />
      )
    }

    return (
      <div className="space-y-4">
        {filtered.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar size="lg">
                    {client.logo && <AvatarImage src={client.logo} />}
                    <AvatarFallback className="bg-muted">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{client.business_name}</h3>
                      {getStatusBadge(client.status, client.has_unfilled)}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {client.business_type}
                    </p>
                    {client.status === 'active' && (
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          {client.shifts_this_month} shifts this month
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span className="font-medium text-brand-600">
                          {formatCurrency(client.total_billed)} billed
                        </span>
                        {client.rating > 0 && (
                          <>
                            <span className="text-muted-foreground">-</span>
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              {client.rating}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {client.next_shift && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Next shift:</span>{' '}
                        {client.next_shift}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {client.status === 'active' && (
                    <>
                      <Link to={`/agency/clients/${client.id}/shifts`}>
                        <Button variant="outline" size="sm">
                          <Calendar className="mr-2 h-4 w-4" />
                          Shifts
                        </Button>
                      </Link>
                      <Link to={`/agency/clients/${client.id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="mr-2 h-4 w-4" />
                          Invoice
                        </Button>
                      </Link>
                    </>
                  )}
                  {client.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleReviewClient(client.business_name)}
                    >
                      Review
                    </Button>
                  )}
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
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client businesses
          </p>
        </div>
        <Link to="/agency/clients/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search clients..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active {isLoading ? '' : `(${activeClients.length})`}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending {isLoading ? '' : `(${pendingClients.length})`}
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive {isLoading ? '' : `(${inactiveClients.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {renderClientList(activeClients, isLoading, error)}
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          {renderClientList(pendingClients, isLoading, error)}
        </TabsContent>
        <TabsContent value="inactive" className="mt-6">
          {renderClientList(inactiveClients, isLoading, error)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
