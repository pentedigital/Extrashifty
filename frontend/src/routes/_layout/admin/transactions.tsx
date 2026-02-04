import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, ArrowUpRight, ArrowDownLeft, Eye } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/_layout/admin/transactions')({
  component: AdminTransactionsPage,
})

const mockTransactions = [
  { id: '1', type: 'payment', description: 'Shift payment - Bartender @ Brazen Head', amount: 108, from: 'The Brazen Head', to: 'John Doe', date: '2026-02-04', status: 'completed' },
  { id: '2', type: 'fee', description: 'Platform fee (10%)', amount: 10.80, from: 'The Brazen Head', to: 'ExtraShifty', date: '2026-02-04', status: 'completed' },
  { id: '3', type: 'payment', description: 'Shift payment - Server @ Restaurant XYZ', amount: 128, from: 'Restaurant XYZ', to: 'Sarah M.', date: '2026-02-03', status: 'completed' },
  { id: '4', type: 'payout', description: 'Weekly payout to worker', amount: 450, from: 'ExtraShifty', to: 'John Doe', date: '2026-02-03', status: 'pending' },
  { id: '5', type: 'refund', description: 'Cancelled shift refund', amount: 54, from: 'ExtraShifty', to: 'Café Central', date: '2026-02-02', status: 'completed' },
]

function AdminTransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredTransactions = mockTransactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || tx.type === activeTab
    return matchesSearch && matchesTab
  })

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'payment': return <Badge variant="success">Payment</Badge>
      case 'fee': return <Badge variant="secondary">Fee</Badge>
      case 'payout': return <Badge variant="default">Payout</Badge>
      case 'refund': return <Badge variant="warning">Refund</Badge>
      default: return <Badge variant="outline">{type}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completed</Badge>
      case 'pending': return <Badge variant="warning">Pending</Badge>
      case 'failed': return <Badge variant="destructive">Failed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
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
                  <div className={`p-2 rounded-full ${tx.type === 'refund' ? 'bg-amber-100' : tx.type === 'payout' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {tx.type === 'payout' || tx.type === 'refund' ? (
                      <ArrowUpRight className={`h-4 w-4 ${tx.type === 'refund' ? 'text-amber-600' : 'text-blue-600'}`} />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
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
                    {getStatusBadge(tx.status)}
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
