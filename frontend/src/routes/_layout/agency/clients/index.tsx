import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Building2, Plus, Search, FileText, Calendar } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_layout/agency/clients/')({
  component: ClientsPage,
})

// Mock data
const mockClients = {
  active: [
    {
      id: '1',
      business_name: 'Hotel ABC',
      business_type: 'hotel',
      logo: null,
      rating: 4.8,
      shifts_this_month: 12,
      total_billed: 4200,
      next_shift: 'Tomorrow 6AM',
      has_unfilled: false,
      status: 'active',
    },
    {
      id: '2',
      business_name: 'Café Central',
      business_type: 'cafe',
      logo: null,
      rating: 4.6,
      shifts_this_month: 8,
      total_billed: 1800,
      next_shift: 'Tomorrow 9AM',
      has_unfilled: true,
      status: 'active',
    },
    {
      id: '3',
      business_name: 'The Local Pub',
      business_type: 'bar',
      logo: null,
      rating: 4.7,
      shifts_this_month: 15,
      total_billed: 3500,
      next_shift: 'Saturday 6PM',
      has_unfilled: false,
      status: 'active',
    },
  ],
  pending: [
    {
      id: '4',
      business_name: 'Restaurant XYZ',
      business_type: 'restaurant',
      logo: null,
      rating: 0,
      shifts_this_month: 0,
      total_billed: 0,
      next_shift: null,
      has_unfilled: false,
      status: 'pending',
    },
  ],
  inactive: [],
}

function ClientsPage() {
  const [activeTab, setActiveTab] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')
  const { addToast } = useToast()

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

  const filteredClients = (clients: typeof mockClients.active) => {
    if (!searchQuery) return clients
    const query = searchQuery.toLowerCase()
    return clients.filter((c) =>
      c.business_name.toLowerCase().includes(query) ||
      c.business_type.toLowerCase().includes(query)
    )
  }

  const renderClientList = (clients: typeof mockClients.active) => {
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
                        <span className="text-muted-foreground">•</span>
                        <span className="font-medium text-brand-600">
                          {formatCurrency(client.total_billed)} billed
                        </span>
                        {client.rating > 0 && (
                          <>
                            <span className="text-muted-foreground">•</span>
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
            Active ({mockClients.active.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({mockClients.pending.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({mockClients.inactive.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {renderClientList(mockClients.active)}
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          {renderClientList(mockClients.pending)}
        </TabsContent>
        <TabsContent value="inactive" className="mt-6">
          {renderClientList(mockClients.inactive)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
