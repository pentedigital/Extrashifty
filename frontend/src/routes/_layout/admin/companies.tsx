import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, CheckCircle, XCircle, Eye, Loader2, MoreVertical } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { useAdminCompanies, useAdminVerifyCompany } from '@/hooks/api/useAdminApi'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_layout/admin/companies')({
  component: AdminCompaniesPage,
})

function AdminCompaniesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { addToast } = useToast()

  // Fetch companies from API
  const { data: companiesData, isLoading, error } = useAdminCompanies({
    search: searchQuery || undefined,
  })
  const verifyCompanyMutation = useAdminVerifyCompany()

  // Process companies for display
  const companies = useMemo(() => {
    if (!companiesData?.items) return []
    return companiesData.items.map(company => ({
      id: String(company.id),
      name: company.business_name || 'Unknown',
      type: 'Company',
      status: company.is_verified ? 'verified' : 'pending',
      email: company.business_email || '',
      shiftsPosted: company.total_shifts || 0,
      totalSpent: company.total_spent || 0,
      rating: 0,
    }))
  }, [companiesData])

  // Filter companies client-side
  const filteredCompanies = companies.filter(company =>
    searchQuery === '' ||
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleViewCompany = (name: string) => {
    addToast({
      type: 'info',
      title: 'Opening company details',
      description: `Loading details for ${name}.`,
    })
  }

  const handleApproveCompany = async (companyId: string, name: string) => {
    try {
      await verifyCompanyMutation.mutateAsync(parseInt(companyId))
      addToast({
        type: 'success',
        title: 'Company approved',
        description: `${name} has been verified and approved.`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to approve company',
        description: 'Please try again.',
      })
    }
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
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-muted-foreground">Manage registered businesses</p>
        </div>
        <EmptyState
          icon={Search}
          title="Unable to load companies"
          description="There was an error loading companies. Please try again later."
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
                          className="text-success"
                          onClick={() => handleApproveCompany(company.id, company.name)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reject"
                          className="text-destructive"
                          onClick={() => handleRejectCompany(company.name)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="More actions"
                      onClick={() => handleMoreOptions(company.name)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredCompanies.length === 0 && (
              <EmptyState
                icon={Search}
                title="No companies match your search"
                description="Try adjusting your search query or filter."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
