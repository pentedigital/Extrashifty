import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Send, Check, Download, FileText, Building2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getInvoiceStatusBadge } from '@/lib/badgeUtils'
import { useAgencyInvoice, useSendInvoice, useMarkInvoicePaid } from '@/hooks/api/useAgencyApi'

export const Route = createFileRoute('/_layout/agency/billing/invoices/$invoiceId')({
  component: InvoiceDetailPage,
})

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams()
  const { addToast } = useToast()

  const { data: invoice, isLoading, error } = useAgencyInvoice(invoiceId)
  const sendInvoiceMutation = useSendInvoice()
  const markPaidMutation = useMarkInvoicePaid()

  const handleSendInvoice = async () => {
    if (!invoice) return
    try {
      await sendInvoiceMutation.mutateAsync(invoice.id)
      addToast({
        type: 'success',
        title: 'Invoice sent',
        description: `${invoice.invoice_number} has been sent to the client.`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to send invoice',
        description: 'Please try again later.',
      })
    }
  }

  const handleMarkPaid = async () => {
    if (!invoice) return
    try {
      await markPaidMutation.mutateAsync(invoice.id)
      addToast({
        type: 'success',
        title: 'Invoice marked as paid',
        description: `${invoice.invoice_number} has been marked as paid.`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to mark invoice as paid',
        description: 'Please try again later.',
      })
    }
  }

  const handleDownload = () => {
    if (!invoice) return
    addToast({
      type: 'success',
      title: 'Download started',
      description: `${invoice.invoice_number}.pdf is being downloaded.`,
    })
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString('en-IE', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-IE', { month: 'long', day: 'numeric', year: 'numeric' })}`
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Link to="/agency/billing/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Link to="/agency/billing/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Invoice Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">Could not load invoice</h2>
            <p className="text-muted-foreground mb-4">
              The invoice you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link to="/agency/billing/invoices">
              <Button>Back to Invoices</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const clientName = invoice.client?.company?.business_name ?? invoice.client?.business_email ?? 'Unknown Client'
  const isSending = sendInvoiceMutation.isPending
  const isMarkingPaid = markPaidMutation.isPending

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/agency/billing/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
              {(() => { const badge = getInvoiceStatusBadge(invoice.status); return <Badge variant={badge.variant} className="text-lg px-3 py-1">{badge.label}</Badge>; })()}
            </div>
            <p className="text-muted-foreground">
              Created on {formatDate(invoice.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          {invoice.status === 'draft' && (
            <Button onClick={handleSendInvoice} disabled={isSending}>
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Invoice
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button onClick={handleMarkPaid} disabled={isMarkingPaid}>
              {isMarkingPaid ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Preview Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-xl font-bold mb-1">INVOICE</h2>
                  <p className="text-muted-foreground">{invoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Your Agency</p>
                  <p className="text-sm text-muted-foreground">agency@example.com</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 mb-8">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bill To</p>
                  <p className="font-semibold">{clientName}</p>
                  {invoice.client?.company?.address && (
                    <p className="text-sm text-muted-foreground">{invoice.client.company.address}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{invoice.client?.business_email}</p>
                </div>
                <div className="text-right sm:text-left">
                  <div className="mb-2">
                    <p className="text-sm text-muted-foreground">Billing Period</p>
                    <p className="font-medium">{formatPeriod(invoice.period_start, invoice.period_end)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">{formatDate(invoice.due_date)}</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Line Items / Shifts */}
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Shifts Summary</h3>
                {invoice.shifts && invoice.shifts.length > 0 ? (
                  <div className="space-y-2">
                    {invoice.shifts.map((shift, index) => (
                      <div key={shift.id ?? index} className="flex justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{shift.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(shift.date)} - {shift.location}
                          </p>
                        </div>
                        <p className="font-medium">{formatCurrency(shift.hourly_rate * 8)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Period billing - {formatPeriod(invoice.period_start, invoice.period_end)}
                  </p>
                )}
              </div>

              <Separator className="my-6" />

              {/* Total */}
              <div className="flex justify-between items-center">
                <p className="text-lg font-semibold">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(invoice.amount)}</p>
              </div>

              {invoice.paid_date && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-green-700 font-medium flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    Paid on {formatDate(invoice.paid_date)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Client Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium">{clientName}</p>
              </div>
              {invoice.client?.company?.business_type && (
                <div>
                  <p className="text-sm text-muted-foreground">Business Type</p>
                  <p className="font-medium capitalize">{invoice.client.company.business_type}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{invoice.client?.business_email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">{formatDate(invoice.created_at)}</p>
                  </div>
                </div>
                {invoice.status !== 'draft' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-medium">Sent</p>
                      <p className="text-sm text-muted-foreground">Sent to client</p>
                    </div>
                  </div>
                )}
                {invoice.status === 'overdue' && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-red-500" />
                    <div>
                      <p className="font-medium">Overdue</p>
                      <p className="text-sm text-muted-foreground">Was due {formatDate(invoice.due_date)}</p>
                    </div>
                  </div>
                )}
                {invoice.paid_date && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium">Paid</p>
                      <p className="text-sm text-muted-foreground">{formatDate(invoice.paid_date)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              {invoice.status === 'overdue' && (
                <Button variant="outline" className="w-full justify-start text-destructive">
                  <Send className="mr-2 h-4 w-4" />
                  Send Reminder
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
