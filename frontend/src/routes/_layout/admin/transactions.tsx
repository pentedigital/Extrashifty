import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, ArrowUpRight, ArrowDownLeft, Eye, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getTransactionStatusBadge } from '@/lib/badgeUtils'
import { useAdminTransactions } from '@/hooks/api/useAdminApi'
import { EmptyState } from '@/components/ui/empty-state'

export const Route = createFileRoute('/_layout/admin/transactions')({
  component: AdminTransactionsPage,
})

function AdminTransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Fetch transactions from API
  const { data: transactionsData, isLoading, error } = useAdminTransactions({
    search: searchQuery || undefined,
    type: activeTab !== 'all' ? activeTab : undefined,
  })

  // Process transactions for display
  const transactions = useMemo(() => {
    if (!transactionsData?.items) return []
    return transactionsData.items.map(tx => ({
      id: String(tx.id),
      type: tx.type || 'payment',
      description: tx.description || 'Transaction',
      amount: tx.amount || 0,
      from: tx.user_email || 'Unknown',
      to: 'ExtraShifty', // Would need additional data
      date: tx.created_at || '',
      status: tx.status || 'pending',
    }))
  }, [transactionsData])

  // Filter transactions client-side
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchQuery === '' ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || tx.type === activeTab
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
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">Monitor all platform transactions</p>
        </div>
        <EmptyState
          icon={Search}
          title="Unable to load transactions"
          description="There was an error loading transactions. Please try again later."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      </div>
    )
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'payment': return <Badge variant="success">Payment</Badge>
      case 'fee': return <Badge variant="secondary">Fee</Badge>
      case 'payout': return <Badge variant="default">Payout</Badge>
      case 'refund': return <Badge variant="warning">Refund</Badge>
      default: return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">Monitor all platform transactions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="payment">Payments</TabsTrigger>
                <TabsTrigger value="payout">Payouts</TabsTrigger>
                <TabsTrigger value="fee">Fees</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${tx.type === 'refund' ? 'bg-warning/10' : tx.type === 'payout' ? 'bg-info/10' : 'bg-success/10'}`}>
                    {tx.type === 'payout' || tx.type === 'refund' ? (
                      <ArrowUpRight className={`h-4 w-4 ${tx.type === 'refund' ? 'text-warning' : 'text-info'}`} />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{tx.description}</p>
                      {getTypeBadge(tx.type)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tx.from} → {tx.to} • {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(tx.amount)}</p>
                    {(() => { const badge = getTransactionStatusBadge(tx.status); return <Badge variant={badge.variant}>{badge.label}</Badge>; })()}
                  </div>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
