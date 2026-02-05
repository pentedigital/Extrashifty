import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Download, User, Settings, Shield, CreditCard, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useAdminAuditLogs } from '@/hooks/api/useAdminApi'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_layout/admin/audit')({
  component: AuditPage,
})

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

  // Fetch audit logs from API
  const { data: auditData, isLoading, error } = useAdminAuditLogs({
    search: searchQuery || undefined,
  })

  // Process audit logs for display
  const auditLogs = useMemo(() => {
    if (!auditData?.items) return []
    return auditData.items.map(log => ({
      id: String(log.id),
      action: log.action || 'unknown',
      actor: log.actor_email || 'system',
      target: log.target_id ? `${log.target_type} #${log.target_id}` : null,
      ip: log.ip_address || null,
      timestamp: log.created_at || '',
      details: typeof log.details === 'object' && log.details !== null
        ? (log.details as { message?: string }).message || JSON.stringify(log.details)
        : String(log.details || ''),
    }))
  }, [auditData])

  // Filter logs client-side
  const filteredLogs = auditLogs.filter(log =>
    searchQuery === '' ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.target?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">Track all platform activity</p>
          </div>
        </div>
        <EmptyState
          icon={Search}
          title="Unable to load audit logs"
          description="There was an error loading audit logs. Please try again later."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      </div>
    )
  }

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
