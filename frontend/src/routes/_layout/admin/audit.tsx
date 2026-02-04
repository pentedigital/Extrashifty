import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Download, User, Settings, Shield, CreditCard } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/_layout/admin/audit')({
  component: AuditPage,
})

const mockAuditLogs = [
  { id: '1', action: 'user.login', actor: 'john@example.com', target: null, ip: '192.168.1.1', timestamp: '2026-02-04T14:32:00', details: 'Successful login' },
  { id: '2', action: 'shift.created', actor: 'sarah@brazenhead.ie', target: 'Shift #4521', ip: '192.168.1.45', timestamp: '2026-02-04T14:28:00', details: 'Created bartender shift' },
  { id: '3', action: 'user.verified', actor: 'admin@extrashifty.com', target: 'maria@example.com', ip: '10.0.0.5', timestamp: '2026-02-04T14:15:00', details: 'ID verification approved' },
  { id: '4', action: 'payment.processed', actor: 'system', target: 'Payout #892', ip: null, timestamp: '2026-02-04T14:00:00', details: 'Automated payout processed' },
  { id: '5', action: 'settings.updated', actor: 'admin@extrashifty.com', target: 'Platform fees', ip: '10.0.0.5', timestamp: '2026-02-04T13:45:00', details: 'Updated fee from 10% to 12%' },
  { id: '6', action: 'user.suspended', actor: 'admin@extrashifty.com', target: 'baduser@example.com', ip: '10.0.0.5', timestamp: '2026-02-04T13:30:00', details: 'Suspended for policy violation' },
]

const actionIcons: Record<string, React.ElementType> = {
  'user.login': User,
  'user.verified': Shield,
  'user.suspended': Shield,
  'shift.created': Settings,
  'payment.processed': CreditCard,
  'settings.updated': Settings,
}

function AuditPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLogs = mockAuditLogs.filter(log =>
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.target?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const getActionBadge = (action: string) => {
    if (action.startsWith('user.')) return <Badge variant="secondary">User</Badge>
    if (action.startsWith('shift.')) return <Badge variant="default">Shift</Badge>
    if (action.startsWith('payment.')) return <Badge variant="success">Payment</Badge>
    if (action.startsWith('settings.')) return <Badge variant="warning">Settings</Badge>
    return <Badge variant="outline">{action}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Track all platform activity</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audit logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const Icon = actionIcons[log.action] || Settings
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono">{log.action}</code>
                      {getActionBadge(log.action)}
                    </div>
                    <p className="text-sm">{log.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {log.actor}
                      {log.target && <> → {log.target}</>}
                      {log.ip && <> • IP: {log.ip}</>}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
