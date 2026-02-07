import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowLeft,
  Loader2,
  Receipt,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useWalletTransactions } from '@/hooks/api/useWalletApi'
import { formatCurrency } from '@/lib/utils'
import { getTransactionStatusBadge } from '@/lib/badgeUtils'
import { getTransactionIcon, getTransactionColor, getTransactionDisplayAmount } from '@/lib/transactionUtils'
import type { TransactionType, TransactionStatus } from '@/hooks/api/useWalletApi'

export const Route = createFileRoute('/_layout/wallet/transactions')({
  component: TransactionsPage,
})

const ITEMS_PER_PAGE = 10

const transactionTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'earning', label: 'Earnings' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'top_up', label: 'Top Ups' },
  { value: 'payment', label: 'Payments' },
]

const transactionStatusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

function TransactionsPage() {
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('')
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading, error } = useWalletTransactions({
    skip: page * ITEMS_PER_PAGE,
    limit: ITEMS_PER_PAGE,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  })

  const transactions = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  const formatTransactionDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-IE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString))
  }

  const handleClearFilters = () => {
    setTypeFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  const hasFilters = typeFilter || statusFilter || dateFrom || dateTo

  // Filter by date range client-side (if API doesn't support it)
  const filteredTransactions = transactions.filter((t) => {
    if (dateFrom) {
      const transactionDate = new Date(t.created_at)
      const fromDate = new Date(dateFrom)
      if (transactionDate < fromDate) return false
    }
    if (dateTo) {
      const transactionDate = new Date(t.created_at)
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      if (transactionDate > toDate) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/wallet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">View and filter all your transactions</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select
                id="type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TransactionType | '')
                  setPage(0)
                }}
                options={transactionTypeOptions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as TransactionStatus | '')
                  setPage(0)
                }}
                options={transactionStatusOptions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(0)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(0)
                }}
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transactions
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {total} total transactions
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <EmptyState
              icon={Receipt}
              title="Error loading transactions"
              description="There was an error loading your transactions. Please try again."
            />
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions found"
              description={
                hasFilters
                  ? 'No transactions match your filters. Try adjusting your search criteria.'
                  : 'Your transaction history will appear here once you start using your wallet.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => {
                  const displayAmount = getTransactionDisplayAmount(transaction.type, transaction.amount)
                  const TransactionIcon = getTransactionIcon(transaction.type)
                  const transactionColor = getTransactionColor(transaction.type)
                  const statusBadge = getTransactionStatusBadge(transaction.status)
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full">
                          <TransactionIcon className={`h-4 w-4 ${transactionColor}`} />
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {transaction.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.description || 'No description'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTransactionDate(transaction.created_at)}
                          </p>
                          {transaction.reference_id && (
                            <p className="text-xs text-muted-foreground">
                              Ref: {transaction.reference_id}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p
                          className={`font-semibold ${
                            displayAmount >= 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {displayAmount >= 0 ? '+' : ''}
                          {formatCurrency(displayAmount, 'EUR')}
                        </p>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
