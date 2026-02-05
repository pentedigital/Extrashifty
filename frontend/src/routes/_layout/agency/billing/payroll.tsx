import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CreditCard, Check, Clock, Search, AlertCircle, Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getPayrollStatusBadge } from '@/lib/badgeUtils'
import { useAgencyPayroll, useAgencyStaff } from '@/hooks/api/useAgencyApi'
import type { PayrollEntry } from '@/types/agency'

export const Route = createFileRoute('/_layout/agency/billing/payroll')({
  component: PayrollPage,
})

function PayrollPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const { addToast } = useToast()

  const { data: payrollData, isLoading, error } = useAgencyPayroll()
  const { data: staffData } = useAgencyStaff()

  // Group payroll entries by status
  const groupedPayroll = useMemo(() => {
    const entries = payrollData?.items ?? []
    const filtered = entries.filter(entry => {
      const staffName = entry.staff_member?.staff?.name ?? entry.staff_member?.name ?? ''
      const matchesSearch = !searchQuery ||
        staffName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStaff = !staffFilter || entry.staff_member_id === staffFilter
      return matchesSearch && matchesStaff
    })

    return {
      pending: filtered.filter(p => p.status === 'pending'),
      approved: filtered.filter(p => p.status === 'approved'),
      paid: filtered.filter(p => p.status === 'paid'),
    }
  }, [payrollData, searchQuery, staffFilter])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const entries = payrollData?.items ?? []
    const pending = entries.filter(p => p.status === 'pending')
    const approved = entries.filter(p => p.status === 'approved')
    const paid = entries.filter(p => p.status === 'paid')

    return {
      pendingTotal: pending.reduce((sum, e) => sum + e.net_amount, 0),
      approvedTotal: approved.reduce((sum, e) => sum + e.net_amount, 0),
      paidTotal: paid.reduce((sum, e) => sum + e.net_amount, 0),
    }
  }, [payrollData])

  const staffOptions = useMemo(() => {
    return (staffData?.items ?? []).map(member => ({
      value: member.id,
      label: member.staff?.name ?? member.name ?? member.email ?? 'Unknown',
    }))
  }, [staffData])

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const selectAll = (entries: PayrollEntry[]) => {
    if (selectedIds.length === entries.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(entries.map((e) => e.id))
    }
  }

  const getTotalSelected = (entries: PayrollEntry[]) => {
    return entries
      .filter((e) => selectedIds.includes(e.id))
      .reduce((sum, e) => sum + e.net_amount, 0)
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-IE', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const getStaffName = (entry: PayrollEntry) => {
    return entry.staff_member?.staff?.name ?? entry.staff_member?.name ?? 'Unknown Staff'
  }

  const getStaffInitials = (entry: PayrollEntry) => {
    const name = getStaffName(entry)
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const renderPayrollList = (entries: PayrollEntry[], showCheckbox = false) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-[80px]" />
          <Skeleton className="h-[80px]" />
          <Skeleton className="h-[80px]" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <p className="text-muted-foreground">Failed to load payroll data. Please try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )
    }

    if (entries.length === 0) {
      return (
        <EmptyState
          icon={CreditCard}
          title="No payroll entries"
          description={searchQuery || staffFilter
            ? 'No payroll entries match your filters.'
            : `No ${activeTab} payroll entries found.`
          }
          action={activeTab === 'pending' ? (
            <Link to="/agency/billing/payroll/process">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Process Payroll
              </Button>
            </Link>
          ) : undefined}
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
                checked={selectedIds.length === entries.length && entries.length > 0}
                onChange={() => selectAll(entries)}
                className="h-4 w-4 rounded border-gray-300"
                aria-label={`Select all ${entries.length} payroll entries`}
              />
              <span className="text-sm">
                Select all ({entries.length})
              </span>
            </label>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected - {formatCurrency(getTotalSelected(entries))}
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
          <Card key={entry.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {showCheckbox && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                    className="h-4 w-4 rounded border-gray-300"
                    aria-label={`Select payroll entry for ${getStaffName(entry)}`}
                    id={`payroll-checkbox-${entry.id}`}
                  />
                )}
                <Avatar aria-label={`Avatar for ${getStaffName(entry)}`}>
                  <AvatarFallback>{getStaffInitials(entry)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{getStaffName(entry)}</p>
                    {(() => { const badge = getPayrollStatusBadge(entry.status); return <Badge variant={badge.variant}>{badge.label}</Badge>; })()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatPeriod(entry.period_start, entry.period_end)} - {entry.shifts?.length ?? 0} shifts - {entry.hours_worked}h
                  </p>
                  {entry.paid_at && (
                    <p className="text-xs text-muted-foreground">
                      Paid on {formatDate(entry.paid_at)}
                    </p>
                  )}
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
                    onClick={() => handlePayIndividual(getStaffName(entry), entry.net_amount)}
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
        <Link to="/agency/billing/payroll/process">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Process Payroll
          </Button>
        </Link>
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
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(summaryStats.pendingTotal)}
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
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(summaryStats.approvedTotal)}
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
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(summaryStats.paidTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search staff..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-transparent text-sm"
        >
          <option value="">All Staff</option>
          {staffOptions.map((staff) => (
            <option key={staff.value} value={staff.value}>
              {staff.label}
            </option>
          ))}
        </select>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds([]) }}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending {isLoading ? '' : `(${groupedPayroll.pending.length})`}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved {isLoading ? '' : `(${groupedPayroll.approved.length})`}
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid {isLoading ? '' : `(${groupedPayroll.paid.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {renderPayrollList(groupedPayroll.pending, true)}
        </TabsContent>
        <TabsContent value="approved" className="mt-6">
          {renderPayrollList(groupedPayroll.approved, true)}
        </TabsContent>
        <TabsContent value="paid" className="mt-6">
          {renderPayrollList(groupedPayroll.paid)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
