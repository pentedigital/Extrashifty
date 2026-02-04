import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, MoreVertical, CheckCircle, XCircle, Eye } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_layout/admin/companies')({
  component: AdminCompaniesPage,
})

const mockCompanies = [
  { id: '1', name: 'The Brazen Head', type: 'Bar / Pub', status: 'verified', email: 'info@brazenhead.ie', shiftsPosted: 156, totalSpent: 24500, rating: 4.8 },
  { id: '2', name: 'Restaurant XYZ', type: 'Restaurant', status: 'pending', email: 'contact@xyz.ie', shiftsPosted: 0, totalSpent: 0, rating: 0 },
  { id: '3', name: 'Hotel Dublin', type: 'Hotel', status: 'verified', email: 'hr@hoteldublin.ie', shiftsPosted: 89, totalSpent: 18200, rating: 4.6 },
  { id: '4', name: 'Café Central', type: 'Café', status: 'verified', email: 'manager@cafecentral.ie', shiftsPosted: 45, totalSpent: 8900, rating: 4.9 },
  { id: '5', name: 'The Local', type: 'Bar / Pub', status: 'suspended', email: 'info@thelocal.ie', shiftsPosted: 23, totalSpent: 4200, rating: 3.2 },
]

function AdminCompaniesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { addToast } = useToast()

  const handleViewCompany = (name: string) => {
    addToast({
      type: 'info',
      title: 'Opening company details',
      description: `Loading details for ${name}.`,
    })
  }

  const handleApproveCompany = (name: string) => {
    addToast({
      type: 'success',
      title: 'Company approved',
      description: `${name} has been verified and approved.`,
    })
  }

  const handleRejectCompany = (name: string) => {
    addToast({
      type: 'warning',
      title: 'Company rejected',
      description: `${name} registration has been rejected.`,
    })
  }

  const handleExportCompanies = () => {
    addToast({
      type: 'success',
      title: 'Export started',
      description: 'Companies data export has been initiated.',
    })
  }

  const handleMoreOptions = (name: string) => {
    addToast({
      type: 'info',
      title: 'More options',
      description: `Additional options for ${name}.`,
    })
  }

  const filteredCompanies = mockCompanies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.email.toLowerCase().includes(searchQuery.toLowerCase())
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
        <h1 className="text-2xl font-bold">Companies</h1>
        <p className="text-muted-foreground">Manage registered businesses</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCompanies}>Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>{company.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{company.name}</p>
                      {getStatusBadge(company.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{company.type} • {company.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden md:block text-right">
                    <p className="font-medium">{company.shiftsPosted} shifts</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(company.totalSpent)} spent</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View details"
                      onClick={() => handleViewCompany(company.name)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {company.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Approve"
                          className="text-green-600"
                          onClick={() => handleApproveCompany(company.name)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reject"
                          className="text-red-600"
                          onClick={() => handleRejectCompany(company.name)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoreOptions(company.name)}
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
