import { useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Euro, FileText, CreditCard, TrendingUp, ArrowRight, AlertCircle, Plus, Wallet, History, DollarSign, Clock, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAgencyInvoices, useAgencyPayroll, useAgencyWallet, useAgencyProfile } from '@/hooks/api/useAgencyApi'
import type { Invoice, PayrollEntry, AgencyMode } from '@/types/agency'

export const Route = createFileRoute('/_layout/agency/billing/')({
  component: BillingOverviewPage,
})

function BillingOverviewPage() {
  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError } = useAgencyInvoices()
  const { data: payrollData, isLoading: payrollLoading, error: payrollError } = useAgencyPayroll()
  const { data: walletData, isLoading: walletLoading } = useAgencyWallet()
  const { data: profileData, isLoading: profileLoading } = useAgencyProfile()

  const agencyMode: AgencyMode = profileData?.mode ?? 'staff_provider'
  const modeLabel = agencyMode === 'staff_provider' ? 'Staff Provider' : 'Full Intermediary'

  // Calculate stats from actual data
  const stats = useMemo(() => {
    const invoices = invoicesData?.items ?? []
    const payroll = payrollData?.items ?? []

    const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'draft')
    const overdueInvoices = invoices.filter(i => i.status === 'overdue')
    const pendingPayroll = payroll.filter(p => p.status === 'pending' || p.status === 'approved')
    const paidPayroll = payroll.filter(p => p.status === 'paid')

    // Calculate this month's revenue from paid invoices
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const paidThisMonth = invoices
      .filter(i => i.status === 'paid' && i.paid_date && new Date(i.paid_date) >= thisMonthStart)
      .reduce((sum, i) => sum + i.amount, 0)

    return {
      total_revenue_month: walletData?.total_revenue ?? paidThisMonth,
      pending_invoices: pendingInvoices.length + overdueInvoices.length,
      pending_invoices_amount: pendingInvoices.reduce((sum, i) => sum + i.amount, 0) + overdueInvoices.reduce((sum, i) => sum + i.amount, 0),
      pending_payroll: pendingPayroll.length,
      pending_payroll_amount: pendingPayroll.reduce((sum, p) => sum + p.net_amount, 0),
      total_staff_paid: paidPayroll.length,
    }
  }, [invoicesData, payrollData, walletData])

  // Get recent items (last 3)
  const recentInvoices = useMemo(() => {
    return (invoicesData?.items ?? [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
  }, [invoicesData])

  const recentPayroll = useMemo(() => {
    return (payrollData?.items ?? [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
  }, [payrollData])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'sent':
        return <Badge variant="default">Sent</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      case 'approved':
        return <Badge variant="success">Approved</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })}`
  }

  const isLoading = invoicesLoading || payrollLoading || walletLoading || profileLoading
  const hasError = invoicesError || payrollError

  // Earnings data
  const availableBalance = walletData?.balance ?? 0
  const pendingBalance = walletData?.pending_payouts ?? 0
  const totalRevenue = walletData?.total_revenue ?? 0

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Failed to load billing data</h2>
        <p className="text-muted-foreground mb-4">Please try again later.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Earnings</h1>
          <p className="text-muted-foreground">
            Manage invoices, payroll, and earnings for your agency
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/agency/billing/invoices/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
          <Link to="/agency/billing/payroll/process">
            <Button variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Process Payroll
            </Button>
          </Link>
        </div>
      </div>

      {/* Agency Earnings Dashboard */}
      <Card className="bg-gradient-to-br from-brand-50 to-brand-100 border-brand-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Earnings from Placements
              </CardTitle>
              <CardDescription>
                Mode: {modeLabel}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-white">
              <Building className="h-3 w-3 mr-1" />
              {modeLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            {isLoading ? (
              <>
                <Skeleton className="h-[80px]" />
                <Skeleton className="h-[80px]" />
                <Skeleton className="h-[80px]" />
              </>
            ) : (
              <>
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(availableBalance)}</p>
                  <p className="text-xs text-muted-foreground">Ready to withdraw</p>
                </div>
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingBalance)}</p>
                  <p className="text-xs text-muted-foreground">Processing</p>
                </div>
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">All time</p>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Link to="/wallet/withdraw">
              <Button className="gap-2">
                <DollarSign className="h-4 w-4" />
                Request Payout
              </Button>
            </Link>
            <Link to="/agency/billing/earnings">
              <Button variant="outline" className="gap-2">
                <History className="h-4 w-4" />
                View Earnings History
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
          </>
        ) : (
          <>
            <StatCard
              title="Revenue This Month"
              value={formatCurrency(stats.total_revenue_month)}
              icon={TrendingUp}
            />
            <StatCard
              title="Pending Invoices"
              value={stats.pending_invoices}
              subtitle={formatCurrency(stats.pending_invoices_amount)}
              icon={FileText}
            />
            <StatCard
              title="Pending Payroll"
              value={stats.pending_payroll}
              subtitle={formatCurrency(stats.pending_payroll_amount)}
              icon={CreditCard}
            />
            <StatCard
              title="Staff Paid"
              value={stats.total_staff_paid}
              subtitle="This month"
              icon={Euro}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link
              to="/agency/billing/invoices"
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-[72px]" />
                <Skeleton className="h-[72px]" />
                <Skeleton className="h-[72px]" />
              </div>
            ) : recentInvoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create your first invoice to start billing clients."
                action={
                  <Link to="/agency/billing/invoices/create">
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Invoice
                    </Button>
                  </Link>
                }
              />
            ) : (
              <>
                <div className="space-y-3">
                  {recentInvoices.map((invoice: Invoice) => (
                    <Link
                      key={invoice.id}
                      to={`/agency/billing/invoices/${invoice.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{invoice.client?.company?.business_name ?? invoice.client?.business_email ?? 'Unknown Client'}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.invoice_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(invoice.amount)}
                        </p>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </Link>
                  ))}
                </div>
                <Link to="/agency/billing/invoices">
                  <Button variant="outline" className="w-full mt-4">
                    <FileText className="mr-2 h-4 w-4" />
                    Manage Invoices
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Payroll */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Payroll</CardTitle>
            <Link
              to="/agency/billing/payroll"
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {payrollLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-[72px]" />
                <Skeleton className="h-[72px]" />
                <Skeleton className="h-[72px]" />
              </div>
            ) : recentPayroll.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payroll entries"
                description="Process payroll to pay your staff members."
                action={
                  <Link to="/agency/billing/payroll/process">
                    <Button size="sm">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Process Payroll
                    </Button>
                  </Link>
                }
              />
            ) : (
              <>
                <div className="space-y-3">
                  {recentPayroll.map((payroll: PayrollEntry) => (
                    <div
                      key={payroll.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{payroll.staff_member?.staff?.name ?? payroll.staff_member?.name ?? 'Unknown Staff'}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPeriod(payroll.period_start, payroll.period_end)} - {payroll.hours_worked}h
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(payroll.net_amount)}
                        </p>
                        {getStatusBadge(payroll.status)}
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/agency/billing/payroll">
                  <Button variant="outline" className="w-full mt-4">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Payroll
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
