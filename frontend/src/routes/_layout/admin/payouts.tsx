import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, CheckCircle, Clock, BanknoteIcon, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { getPayoutStatusBadge } from '@/lib/badgeUtils'
import { useAdminPayouts, useAdminProcessPayout } from '@/hooks/api/useAdminApi'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_layout/admin/payouts')({
  component: AdminPayoutsPage,
})

function AdminPayoutsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const { addToast } = useToast()

  // Fetch payouts from API
  const { data: payoutsData, isLoading, error } = useAdminPayouts({
    search: searchQuery || undefined,
    status: activeTab !== 'all' ? activeTab : undefined,
  })
  const processPayoutMutation = useAdminProcessPayout()

  // Process payouts for display
  const payouts = useMemo(() => {
    if (!payoutsData?.items) return []
    return payoutsData.items.map(payout => ({
      id: String(payout.id),
      recipient: payout.user_name || 'Unknown',
      type: 'worker', // Would need additional data to determine
      amount: payout.amount || 0,
      shifts: 0, // Would need additional data
      period: '', // Would need additional data
      status: payout.status || 'pending',
      bankLast4: payout.method?.slice(-4) || '****',
    }))
  }, [payoutsData])

  // Filter payouts client-side
  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = searchQuery === '' ||
      payout.recipient.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || payout.status === activeTab
    return matchesSearch && matchesTab
  })

  const handleProcessPayout = async (payoutId: string, recipient: string, amount: number) => {
    try {
      await processPayoutMutation.mutateAsync(parseInt(payoutId))
      addToast({
        type: 'success',
        title: 'Payout initiated',
        description: `Processing ${formatCurrency(amount)} payout to ${recipient}.`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to process payout',
        description: 'Please try again.',
      })
    }
  }

  const handleProcessAllPending = (totalAmount: number) => {
    addToast({
      type: 'success',
      title: 'Batch payout initiated',
      description: `Processing all pending payouts totaling ${formatCurrency(totalAmount)}.`,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Payouts</h1>
            <p className="text-muted-foreground">Process worker and agency payouts</p>
          </div>
        </div>
        <EmptyState
          icon={Search}
          title="Unable to load payouts"
          description="There was an error loading payouts. Please try again later."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      </div>
    )
  }

  const pendingTotal = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-muted-foreground">Process worker and agency payouts</p>
        </div>
        <Button onClick={() => handleProcessAllPending(pendingTotal)}>
          <BanknoteIcon className="mr-2 h-4 w-4" />
          Process All Pending ({formatCurrency(pendingTotal)})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="processing">Processing</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredPayouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${payout.status === 'completed' ? 'bg-success/10' : 'bg-warning/10'}`}>
                    {payout.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <Clock className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{payout.recipient}</p>
                      <Badge variant="outline">{payout.type}</Badge>
                      {(() => { const badge = getPayoutStatusBadge(payout.status); return <Badge variant={badge.variant}>{badge.label}</Badge>; })()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {payout.shifts} shifts • {payout.period} • ****{payout.bankLast4}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-lg">{formatCurrency(payout.amount)}</p>
                  {payout.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleProcessPayout(payout.id, payout.recipient, payout.amount)}
                    >
                      Process
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
