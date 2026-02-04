import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CreditCard, Check, Clock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_layout/agency/billing/payroll')({
  component: PayrollPage,
})

// Mock data
const mockPayroll = {
  pending: [
    {
      id: '1',
      name: 'John Doe',
      avatar: null,
      period: 'Jan 27 - Feb 2, 2026',
      hours: 32,
      gross_amount: 576,
      deductions: 0,
      net_amount: 576,
      shifts_count: 4,
      status: 'pending',
    },
    {
      id: '2',
      name: 'Maria Santos',
      avatar: null,
      period: 'Jan 27 - Feb 2, 2026',
      hours: 28,
      gross_amount: 504,
      deductions: 0,
      net_amount: 504,
      shifts_count: 3,
      status: 'pending',
    },
    {
      id: '3',
      name: 'Sarah Chen',
      avatar: null,
      period: 'Jan 27 - Feb 2, 2026',
      hours: 24,
      gross_amount: 336,
      deductions: 0,
      net_amount: 336,
      shifts_count: 3,
      status: 'pending',
    },
  ],
  approved: [
    {
      id: '4',
      name: 'Tom Wilson',
      avatar: null,
      period: 'Jan 20 - Jan 26, 2026',
      hours: 40,
      gross_amount: 720,
      deductions: 0,
      net_amount: 720,
      shifts_count: 5,
      status: 'approved',
    },
  ],
  paid: [
    {
      id: '5',
      name: 'John Doe',
      avatar: null,
      period: 'Jan 20 - Jan 26, 2026',
      hours: 36,
      gross_amount: 648,
      deductions: 0,
      net_amount: 648,
      shifts_count: 5,
      paid_date: '2026-01-28',
      status: 'paid',
    },
    {
      id: '6',
      name: 'Maria Santos',
      avatar: null,
      period: 'Jan 20 - Jan 26, 2026',
      hours: 32,
      gross_amount: 576,
      deductions: 0,
      net_amount: 576,
      shifts_count: 4,
      paid_date: '2026-01-28',
      status: 'paid',
    },
  ],
}

function PayrollPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { addToast } = useToast()

  const handleApproveSelected = (count: number, totalAmount: number) => {
    addToast({
      type: 'success',
      title: 'Payroll approved',
      description: `${count} payroll entries totaling ${formatCurrency(totalAmount)} have been approved.`,
    })
    setSelectedIds([])
  }

  const handlePaySelected = (count: number, totalAmount: number) => {
    addToast({
      type: 'success',
      title: 'Payment initiated',
      description: `Payment of ${formatCurrency(totalAmount)} for ${count} staff members has been initiated.`,
    })
    setSelectedIds([])
  }

  const handlePayIndividual = (name: string, amount: number) => {
    addToast({
      type: 'success',
      title: 'Payment initiated',
      description: `Payment of ${formatCurrency(amount)} to ${name} has been initiated.`,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'approved':
        return <Badge variant="default">Approved</Badge>
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const selectAll = (entries: typeof mockPayroll.pending) => {
    if (selectedIds.length === entries.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(entries.map((e) => e.id))
    }
  }

  const getTotalSelected = (entries: typeof mockPayroll.pending) => {
    return entries
      .filter((e) => selectedIds.includes(e.id))
      .reduce((sum, e) => sum + e.net_amount, 0)
  }

  const renderPayrollList = (entries: typeof mockPayroll.pending, showCheckbox = false) => {
    if (entries.length === 0) {
      return (
        <EmptyState
          icon={CreditCard}
          title="No payroll entries"
          description={`No ${activeTab} payroll entries found.`}
        />
      )
    }

    return (
      <div className="space-y-3">
        {showCheckbox && entries.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === entries.length}
                onChange={() => selectAll(entries)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">
                Select all ({entries.length})
              </span>
            </label>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected • {formatCurrency(getTotalSelected(entries))}
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    activeTab === 'pending'
                      ? handleApproveSelected(selectedIds.length, getTotalSelected(entries))
                      : handlePaySelected(selectedIds.length, getTotalSelected(entries))
                  }
                >
                  {activeTab === 'pending' ? 'Approve Selected' : 'Pay Selected'}
                </Button>
              </div>
            )}
          </div>
        )}

        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {showCheckbox && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                )}
                <Avatar>
                  {entry.avatar && <AvatarImage src={entry.avatar} />}
                  <AvatarFallback>
                    {entry.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{entry.name}</p>
                    {getStatusBadge(entry.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {entry.period} • {entry.shifts_count} shifts • {entry.hours}h
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {formatCurrency(entry.net_amount)}
                  </p>
                  {entry.deductions > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Gross: {formatCurrency(entry.gross_amount)}
                    </p>
                  )}
                </div>
                {!showCheckbox && entry.status === 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => handlePayIndividual(entry.name, entry.net_amount)}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/agency/billing">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">
            Manage staff payments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="font-semibold">
                  {formatCurrency(mockPayroll.pending.reduce((s, e) => s + e.net_amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ready to Pay</p>
                <p className="font-semibold">
                  {formatCurrency(mockPayroll.approved.reduce((s, e) => s + e.net_amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid This Month</p>
                <p className="font-semibold">
                  {formatCurrency(mockPayroll.paid.reduce((s, e) => s + e.net_amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds([]) }}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({mockPayroll.pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({mockPayroll.approved.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({mockPayroll.paid.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {renderPayrollList(mockPayroll.pending, true)}
        </TabsContent>
        <TabsContent value="approved" className="mt-6">
          {renderPayrollList(mockPayroll.approved, true)}
        </TabsContent>
        <TabsContent value="paid" className="mt-6">
          {renderPayrollList(mockPayroll.paid)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
