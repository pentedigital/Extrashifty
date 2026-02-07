import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Shield, Ban, Mail, Loader2 } from 'lucide-react'
import { useAdminUsers } from '@/hooks/api/useAdminApi'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_layout/admin/users')({
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Fetch users from API
  const { data: usersData, isLoading, error } = useAdminUsers({
    search: searchQuery || undefined,
    user_type: activeTab !== 'all' ? activeTab : undefined,
  })

  // Process users for display
  const users = useMemo(() => {
    if (!usersData?.items) return []
    return usersData.items.map(user => ({
      id: String(user.id),
      name: user.full_name || 'Unknown',
      email: user.email || '',
      type: user.user_type || 'staff',
      status: user.is_active ? 'active' : 'suspended',
      verified: user.is_verified || false,
      joined: user.created_at || '',
      shifts: 0, // Would need additional API call for this
    }))
  }, [usersData])

  // Filter users client-side for search (in case API doesn't support it)
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || user.type === activeTab
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
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage platform users</p>
        </div>
        <EmptyState
          icon={Search}
          title="Unable to load users"
          description="There was an error loading users. Please try again later."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">Active</Badge>
      case 'suspended': return <Badge variant="destructive">Suspended</Badge>
      case 'pending': return <Badge variant="warning">Pending</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'staff': return <Badge variant="secondary">Staff</Badge>
      case 'company': return <Badge variant="outline">Company</Badge>
      case 'agency': return <Badge variant="outline">Agency</Badge>
      default: return <Badge>{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage platform users</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="staff">Staff</TabsTrigger>
                <TabsTrigger value="company">Companies</TabsTrigger>
                <TabsTrigger value="agency">Agencies</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors gap-3"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar className="shrink-0">
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{user.name}</p>
                      {user.verified && <Shield className="h-4 w-4 text-green-600 shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex sm:hidden items-center gap-2 mt-1">
                      {getTypeBadge(user.type)}
                      {getStatusBadge(user.status)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="hidden sm:flex items-center gap-2">
                    {getTypeBadge(user.type)}
                    {getStatusBadge(user.status)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="Send email">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Suspend user">
                      <Ban className="h-4 w-4" />
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
