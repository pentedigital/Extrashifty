import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, MoreVertical, Shield, Ban, Mail } from 'lucide-react'

export const Route = createFileRoute('/_layout/admin/users')({
  component: AdminUsersPage,
})

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', type: 'staff', status: 'active', verified: true, joined: '2025-01-15', shifts: 24 },
  { id: '2', name: 'Sarah Manager', email: 'sarah@brazenhead.ie', type: 'company', status: 'active', verified: true, joined: '2025-02-01', shifts: 0 },
  { id: '3', name: 'Mike Wilson', email: 'mike@example.com', type: 'staff', status: 'suspended', verified: true, joined: '2024-11-20', shifts: 12 },
  { id: '4', name: 'Dublin Staffing', email: 'info@dublinstaffing.ie', type: 'agency', status: 'active', verified: true, joined: '2024-10-05', shifts: 0 },
  { id: '5', name: 'Emma Brown', email: 'emma@example.com', type: 'staff', status: 'active', verified: false, joined: '2026-01-28', shifts: 0 },
  { id: '6', name: 'Restaurant XYZ', email: 'contact@xyz.ie', type: 'company', status: 'pending', verified: false, joined: '2026-02-02', shifts: 0 },
]

function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || user.type === activeTab
    return matchesSearch && matchesTab
  })

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
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {user.verified && <Shield className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
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
