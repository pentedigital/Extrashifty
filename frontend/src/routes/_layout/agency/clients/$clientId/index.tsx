import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Building2, Star, Calendar, MapPin, Phone, Mail, Globe, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export const Route = createFileRoute('/_layout/agency/clients/$clientId/')({
  component: ClientDetailsPage,
})

const mockClient = {
  id: '1',
  businessName: 'Hotel ABC',
  businessType: 'hotel',
  logo: null,
  description: 'A premium 4-star hotel in Dublin city centre, known for excellent hospitality and fine dining.',
  address: '123 O\'Connell Street, Dublin 1',
  city: 'Dublin',
  email: 'hr@hotelabc.ie',
  phone: '+353 1 234 5678',
  website: 'www.hotelabc.ie',
  contactPerson: 'Mary O\'Brien',
  rating: 4.8,
  reviewCount: 124,
  status: 'active',
  contractStart: '2025-03-01',
  billingRateMarkup: 15,
  stats: {
    shiftsThisMonth: 12,
    shiftsTotal: 89,
    totalBilled: 28500,
    outstandingBalance: 4200,
  },
  recentInvoices: [
    { id: 'INV-001', date: '2026-02-01', amount: 4200, status: 'pending' },
    { id: 'INV-002', date: '2026-01-01', amount: 3800, status: 'paid' },
    { id: 'INV-003', date: '2025-12-01', amount: 4100, status: 'paid' },
  ],
  topStaff: [
    { id: '1', name: 'John Doe', shiftsCompleted: 18, rating: 4.9 },
    { id: '2', name: 'Maria Santos', shiftsCompleted: 12, rating: 4.7 },
    { id: '3', name: 'Tom Wilson', shiftsCompleted: 8, rating: 4.8 },
  ],
}

function ClientDetailsPage() {
  const { clientId } = Route.useParams()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const client = mockClient

  // Guard against missing clientId
  if (!clientId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Client not found</h1>
        <p className="text-muted-foreground">Invalid client ID.</p>
      </div>
    )
  }

  const handleSendInvoice = (invoiceId: string) => {
    addToast({
      type: 'success',
      title: 'Invoice sent',
      description: `Invoice ${invoiceId} has been sent to ${client.email}`,
    })
  }

  const handleGenerateInvoice = () => {
    addToast({
      type: 'success',
      title: 'Invoice generated',
      description: `New invoice for ${client.businessName} has been created.`,
    })
  }

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/agency/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{client.businessName}</h1>
          <p className="text-muted-foreground capitalize">{client.businessType}</p>
        </div>
        <Link to={`/agency/clients/${clientId}/shifts`}>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            View Shifts
          </Button>
        </Link>
        <Link to="/agency/shifts/create">
          <Button>Create Shift</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar size="xl">
                <AvatarFallback className="bg-muted">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{client.businessName}</h2>
              <Badge variant="success" className="mt-2">Active Client</Badge>
              <div className="flex items-center gap-1 mt-3">
                <Star className="h-5 w-5 text-warning fill-warning" />
                <span className="font-semibold">{client.rating}</span>
                <span className="text-muted-foreground">({client.reviewCount} reviews)</span>
              </div>
              <div className="w-full mt-6 space-y-2 text-sm text-left">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{client.address}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{client.phone}</span>
                </div>
                {client.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>{client.website}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Client since {formatDate(client.contractStart)}</span>
                </div>
              </div>
              <div className="w-full mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-1">Contact Person</p>
                <p className="font-medium">{client.contactPerson}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="staff">Top Staff</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold">{client.stats.shiftsThisMonth}</p>
                    <p className="text-sm text-muted-foreground">This Month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold">{client.stats.shiftsTotal}</p>
                    <p className="text-sm text-muted-foreground">Total Shifts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold">{formatCurrency(client.stats.totalBilled)}</p>
                    <p className="text-sm text-muted-foreground">Total Billed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-warning">{formatCurrency(client.stats.outstandingBalance)}</p>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                  </CardContent>
                </Card>
              </div>

              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{client.description}</p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Billing Rate Markup</p>
                    <p className="font-medium">{client.billingRateMarkup}% on worker rates</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Invoice history for this client</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.recentInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(invoice.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                        {getInvoiceStatusBadge(invoice.status)}
                        {invoice.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => handleSendInvoice(invoice.id)}>
                            Send Reminder
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                      <p className="text-2xl font-bold text-warning">{formatCurrency(client.stats.outstandingBalance)}</p>
                    </div>
                    <Button onClick={handleGenerateInvoice}>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="staff" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Staff</CardTitle>
                  <CardDescription>Staff members who work most frequently with this client</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.topStaff.map((staff, index) => (
                    <Link key={staff.id} to={`/agency/staff/${staff.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-semibold text-sm">
                            #{index + 1}
                          </div>
                          <Avatar>
                            <AvatarFallback>
                              {staff.name?.split(' ').map((n) => n[0]).join('') ?? '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-sm text-muted-foreground">{staff.shiftsCompleted} shifts completed</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          <span className="font-medium">{staff.rating}</span>
                        </div>
                      </div>
                    </Link>
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
