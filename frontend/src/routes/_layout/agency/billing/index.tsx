import { createFileRoute, Link } from '@tanstack/react-router'
import { Euro, FileText, CreditCard, TrendingUp, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

export const Route = createFileRoute('/_layout/agency/billing/')({
  component: BillingOverviewPage,
})

// Mock data
const mockStats = {
  total_revenue_month: 12500,
  pending_invoices: 3,
  pending_invoices_amount: 4200,
  pending_payroll: 5,
  pending_payroll_amount: 2800,
  total_staff_paid: 38,
}

const mockRecentInvoices = [
  {
    id: '1',
    client: 'Hotel ABC',
    invoice_number: 'INV-2026-0042',
    amount: 1850,
    status: 'sent',
    due_date: '2026-02-15',
  },
  {
    id: '2',
    client: 'Café Central',
    invoice_number: 'INV-2026-0041',
    amount: 920,
    status: 'paid',
    due_date: '2026-02-01',
  },
  {
    id: '3',
    client: 'The Local',
    invoice_number: 'INV-2026-0040',
    amount: 1430,
    status: 'overdue',
    due_date: '2026-01-25',
  },
]

const mockRecentPayroll = [
  {
    id: '1',
    name: 'John Doe',
    period: 'Jan 27 - Feb 2',
    hours: 32,
    amount: 576,
    status: 'pending',
  },
  {
    id: '2',
    name: 'Maria Santos',
    period: 'Jan 27 - Feb 2',
    hours: 28,
    amount: 504,
    status: 'pending',
  },
  {
    id: '3',
    name: 'Tom Wilson',
    period: 'Jan 20 - Jan 26',
    hours: 40,
    amount: 720,
    status: 'paid',
  },
]

function BillingOverviewPage() {
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
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing Overview</h1>
        <p className="text-muted-foreground">
          Manage invoices and payroll for your agency
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue This Month"
          value={formatCurrency(mockStats.total_revenue_month)}
          icon={TrendingUp}
        />
        <StatCard
          title="Pending Invoices"
          value={mockStats.pending_invoices}
          subtitle={formatCurrency(mockStats.pending_invoices_amount)}
          icon={FileText}
        />
        <StatCard
          title="Pending Payroll"
          value={mockStats.pending_payroll}
          subtitle={formatCurrency(mockStats.pending_payroll_amount)}
          icon={CreditCard}
        />
        <StatCard
          title="Staff Paid"
          value={mockStats.total_staff_paid}
          subtitle="This month"
          icon={Euro}
        />
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
            <div className="space-y-3">
              {mockRecentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{invoice.client}</p>
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
                </div>
              ))}
            </div>
            <Link to="/agency/billing/invoices">
              <Button variant="outline" className="w-full mt-4">
                <FileText className="mr-2 h-4 w-4" />
                Manage Invoices
              </Button>
            </Link>
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
            <div className="space-y-3">
              {mockRecentPayroll.map((payroll) => (
                <div
                  key={payroll.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{payroll.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {payroll.period} • {payroll.hours}h
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(payroll.amount)}
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
