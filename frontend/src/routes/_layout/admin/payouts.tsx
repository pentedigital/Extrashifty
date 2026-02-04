import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, CheckCircle, Clock, BanknoteIcon } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/_layout/admin/payouts')({
  component: AdminPayoutsPage,
})

const mockPayouts = [
  { id: '1', recipient: 'John Doe', type: 'worker', amount: 450, shifts: 4, period: 'Feb 1-7, 2026', status: 'pending', bankLast4: '4567' },
  { id: '2', recipient: 'Sarah M.', type: 'worker', amount: 320, shifts: 3, period: 'Feb 1-7, 2026', status: 'pending', bankLast4: '8901' },
  { id: '3', recipient: 'Dublin Staffing Solutions', type: 'agency', amount: 2450, shifts: 18, period: 'Feb 1-7, 2026', status: 'processing', bankLast4: '2345' },
  { id: '4', recipient: 'Mike Wilson', type: 'worker', amount: 180, shifts: 2, period: 'Jan 25-31, 2026', status: 'completed', bankLast4: '6789' },
  { id: '5', recipient: 'Cork Hospitality Services', type: 'agency', amount: 1890, shifts: 14, period: 'Jan 25-31, 2026', status: 'completed', bankLast4: '3456' },
]

function AdminPayoutsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const { addToast } = useToast()

  const handleProcessPayout = (recipient: string, amount: number) => {
    addToast({
      type: 'success',
      title: 'Payout initiated',
      description: `Processing ${formatCurrency(amount)} payout to ${recipient}.`,
    })
  }

  const handleProcessAllPending = (totalAmount: number) => {
    addToast({
      type: 'success',
      title: 'Batch payout initiated',
      description: `Processing all pending payouts totaling ${formatCurrency(totalAmount)}.`,
    })
  }

  const filteredPayouts = mockPayouts.filter(payout => {
    const matchesSearch = payout.recipient.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || payout.status === activeTab
    return matchesSearch && matchesTab
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">Pending</Badge>
      case 'processing': return <Badge variant="default">Processing</Badge>
      case 'completed': return <Badge variant="success">Completed</Badge>
      case 'failed': return <Badge variant="destructive">Failed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const pendingTotal = mockPayouts
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
                  <div className={`p-2 rounded-full ${payout.status === 'completed' ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {payout.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{payout.recipient}</p>
                      <Badge variant="outline">{payout.type}</Badge>
                      {getStatusBadge(payout.status)}
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
                      onClick={() => handleProcessPayout(payout.recipient, payout.amount)}
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
