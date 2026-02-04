import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, Plus, MoreVertical, Shield, ShieldCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/_layout/admin/admins')({
  component: AdminsPage,
})

const mockAdmins = [
  { id: '1', name: 'Super Admin', email: 'superadmin@extrashifty.com', role: 'super_admin', status: 'active', lastLogin: '2026-02-04T14:30:00' },
  { id: '2', name: 'Admin User', email: 'admin@extrashifty.com', role: 'admin', status: 'active', lastLogin: '2026-02-04T12:15:00' },
  { id: '3', name: 'Support Admin', email: 'support@extrashifty.com', role: 'admin', status: 'active', lastLogin: '2026-02-03T16:45:00' },
  { id: '4', name: 'Finance Admin', email: 'finance@extrashifty.com', role: 'admin', status: 'inactive', lastLogin: '2026-01-28T09:00:00' },
]

function AdminsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAdmins = mockAdmins.filter(admin =>
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') {
      return (
        <Badge variant="default" className="bg-purple-600">
          <ShieldCheck className="mr-1 h-3 w-3" />
          Super Admin
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        <Shield className="mr-1 h-3 w-3" />
        Admin
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Users</h1>
          <p className="text-muted-foreground">Manage platform administrators</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search admins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredAdmins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {admin.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{admin.name}</p>
                      {getRoleBadge(admin.role)}
                      {admin.status === 'inactive' && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Last login</p>
                    <p>{formatDate(admin.lastLogin)}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                <p className="font-medium">Super Admin</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Full access to all features including admin user management, system settings, and audit logs.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium">Admin</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Access to user management, company/agency approvals, shift monitoring, and transaction oversight.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
