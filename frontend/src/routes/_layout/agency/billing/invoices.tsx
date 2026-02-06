import { useState, useMemo } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus, FileText, Send, Eye, Download, Search, AlertCircle, Check, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getInvoiceStatusBadge } from '@/lib/badgeUtils'
import { useAgencyInvoices, useSendInvoice, useMarkInvoicePaid, useAgencyClients } from '@/hooks/api/useAgencyApi'
import type { Invoice } from '@/types/agency'

export const Route = createFileRoute('/_layout/agency/billing/invoices')({
  component: InvoicesPage,
})

function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('sent')
  const [searchQuery, setSearchQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const { addToast } = useToast()
  const navigate = useNavigate()

  const { data: invoicesData, isLoading, error } = useAgencyInvoices()
  const { data: clientsData } = useAgencyClients()
  const sendInvoiceMutation = useSendInvoice()
  const markPaidMutation = useMarkInvoicePaid()

  // Group invoices by status
  const groupedInvoices = useMemo(() => {
    const invoices = invoicesData?.items ?? []
    const filtered = invoices.filter(invoice => {
      const clientName = invoice.client?.company?.business_name ?? invoice.client?.business_email ?? ''
      const matchesSearch = !searchQuery ||
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesClient = !clientFilter || invoice.client_id === clientFilter
      return matchesSearch && matchesClient
    })

    return {
      draft: filtered.filter(i => i.status === 'draft'),
      sent: filtered.filter(i => i.status === 'sent'),
      paid: filtered.filter(i => i.status === 'paid'),
      overdue: filtered.filter(i => i.status === 'overdue'),
    }
  }, [invoicesData, searchQuery, clientFilter])

  const clientOptions = useMemo(() => {
    return (clientsData?.items ?? []).map(client => ({
      value: client.id,
      label: client.company?.business_name ?? client.business_email,
    }))
  }, [clientsData])

  const handlePreviewInvoice = (invoiceId: string) => {
    navigate({ to: `/agency/billing/invoices/${invoiceId}` })
  }

  const handleDownloadInvoice = (invoiceNumber: string) => {
    addToast({
      type: 'success',
      title: 'Download started',
      description: `${invoiceNumber}.pdf is being downloaded.`,
    })
  }

  const handleSendInvoice = async (invoice: Invoice) => {
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

  const handleMarkPaid = async (invoice: Invoice) => {
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

  const handleSendReminder = (invoice: Invoice) => {
    const clientName = invoice.client?.company?.business_name ?? invoice.client?.business_email ?? 'client'
    addToast({
      type: 'success',
      title: 'Reminder sent',
      description: `Payment reminder for ${invoice.invoice_number} sent to ${clientName}.`,
    })
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-IE', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const renderInvoiceList = (invoices: Invoice[]) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <p className="text-muted-foreground">Failed to load invoices. Please try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )
    }

    if (invoices.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="No invoices"
          description={searchQuery || clientFilter
            ? 'No invoices match your filters.'
            : `No ${activeTab} invoices found.`
          }
          action={activeTab === 'draft' ? (
            <Link to="/agency/billing/invoices/create">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </Link>
          ) : undefined}
        />
      )
    }

    return (
      <div className="space-y-3">
        {invoices.map((invoice) => {
          const clientName = invoice.client?.company?.business_name ?? invoice.client?.business_email ?? 'Unknown Client'
          const isSending = sendInvoiceMutation.isPending && sendInvoiceMutation.variables === invoice.id
          const isMarkingPaid = markPaidMutation.isPending && markPaidMutation.variables === invoice.id

          return (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/agency/billing/invoices/${invoice.id}`}
                        className="font-semibold hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                      {(() => { const badge = getInvoiceStatusBadge(invoice.status); return <Badge variant={badge.variant}>{badge.label}</Badge>; })()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {clientName} - {formatPeriod(invoice.period_start, invoice.period_end)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.shifts?.length ?? 0} shifts
                      {invoice.due_date && invoice.status !== 'paid' && ` - Due ${formatDate(invoice.due_date)}`}
                      {invoice.paid_date && ` - Paid ${formatDate(invoice.paid_date)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-lg">
                      {formatCurrency(invoice.amount)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        title="View"
                        onClick={() => handlePreviewInvoice(invoice.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Download"
                        onClick={() => handleDownloadInvoice(invoice.invoice_number)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {invoice.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleSendInvoice(invoice)}
                          disabled={isSending}
                        >
                          {isSending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Send
                        </Button>
                      )}
                      {invoice.status === 'sent' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPaid(invoice)}
                          disabled={isMarkingPaid}
                        >
                          {isMarkingPaid ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Mark Paid
                        </Button>
                      )}
                      {invoice.status === 'overdue' && (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleSendReminder(invoice)}
                          >
                            Send Reminder
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPaid(invoice)}
                            disabled={isMarkingPaid}
                          >
                            {isMarkingPaid ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}
                            Mark Paid
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
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
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage client invoices
          </p>
        </div>
        <Link to="/agency/billing/invoices/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search invoices..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-transparent text-sm"
        >
          <option value="">All Clients</option>
          {clientOptions.map((client) => (
            <option key={client.value} value={client.value}>
              {client.label}
            </option>
          ))}
        </select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="draft">
            Drafts {isLoading ? '' : `(${groupedInvoices.draft.length})`}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent {isLoading ? '' : `(${groupedInvoices.sent.length})`}
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid {isLoading ? '' : `(${groupedInvoices.paid.length})`}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue {isLoading ? '' : `(${groupedInvoices.overdue.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draft" className="mt-6">
          {renderInvoiceList(groupedInvoices.draft)}
        </TabsContent>
        <TabsContent value="sent" className="mt-6">
          {renderInvoiceList(groupedInvoices.sent)}
        </TabsContent>
        <TabsContent value="paid" className="mt-6">
          {renderInvoiceList(groupedInvoices.paid)}
        </TabsContent>
        <TabsContent value="overdue" className="mt-6">
          {renderInvoiceList(groupedInvoices.overdue)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
