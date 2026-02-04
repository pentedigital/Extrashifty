import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Plus, FileText, Send, Eye, Download } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/_layout/agency/billing/invoices')({
  component: InvoicesPage,
})

// Mock data
const mockInvoices = {
  draft: [
    {
      id: '1',
      client: 'Restaurant XYZ',
      invoice_number: 'INV-2026-0043',
      amount: 2100,
      period: 'Feb 1-7, 2026',
      shifts_count: 5,
      status: 'draft',
    },
  ],
  sent: [
    {
      id: '2',
      client: 'Hotel ABC',
      invoice_number: 'INV-2026-0042',
      amount: 1850,
      period: 'Jan 25-31, 2026',
      shifts_count: 4,
      due_date: '2026-02-15',
      status: 'sent',
    },
    {
      id: '3',
      client: 'Café Central',
      invoice_number: 'INV-2026-0039',
      amount: 780,
      period: 'Jan 18-24, 2026',
      shifts_count: 3,
      due_date: '2026-02-08',
      status: 'sent',
    },
  ],
  paid: [
    {
      id: '4',
      client: 'Café Central',
      invoice_number: 'INV-2026-0041',
      amount: 920,
      period: 'Jan 25-31, 2026',
      shifts_count: 3,
      paid_date: '2026-02-02',
      status: 'paid',
    },
    {
      id: '5',
      client: 'The Local',
      invoice_number: 'INV-2026-0038',
      amount: 1650,
      period: 'Jan 18-24, 2026',
      shifts_count: 6,
      paid_date: '2026-01-30',
      status: 'paid',
    },
  ],
  overdue: [
    {
      id: '6',
      client: 'The Local',
      invoice_number: 'INV-2026-0040',
      amount: 1430,
      period: 'Jan 11-17, 2026',
      shifts_count: 5,
      due_date: '2026-01-25',
      status: 'overdue',
    },
  ],
}

function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('sent')
  const { addToast } = useToast()

  const handlePreviewInvoice = (invoiceNumber: string) => {
    addToast({
      type: 'info',
      title: 'Opening invoice preview',
      description: `Previewing ${invoiceNumber}`,
    })
  }

  const handleDownloadInvoice = (invoiceNumber: string) => {
    addToast({
      type: 'success',
      title: 'Download started',
      description: `${invoiceNumber}.pdf is being downloaded.`,
    })
  }

  const handleSendInvoice = (invoiceNumber: string, client: string) => {
    addToast({
      type: 'success',
      title: 'Invoice sent',
      description: `${invoiceNumber} has been sent to ${client}.`,
    })
  }

  const handleSendReminder = (invoiceNumber: string, client: string) => {
    addToast({
      type: 'success',
      title: 'Reminder sent',
      description: `Payment reminder for ${invoiceNumber} sent to ${client}.`,
    })
  }

  const handleCreateInvoice = () => {
    addToast({
      type: 'info',
      title: 'Create invoice',
      description: 'Invoice creation wizard will open shortly.',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'sent':
        return <Badge variant="default">Sent</Badge>
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const renderInvoiceList = (invoices: typeof mockInvoices.sent) => {
    if (invoices.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="No invoices"
          description={`No ${activeTab} invoices found.`}
        />
      )
    }

    return (
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{invoice.invoice_number}</p>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {invoice.client} • {invoice.period}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.shifts_count} shifts
                    {'due_date' in invoice && ` • Due ${formatDate(invoice.due_date)}`}
                    {'paid_date' in invoice && ` • Paid ${formatDate(invoice.paid_date)}`}
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
                      title="Preview"
                      onClick={() => handlePreviewInvoice(invoice.invoice_number)}
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
                        onClick={() => handleSendInvoice(invoice.invoice_number, invoice.client)}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send
                      </Button>
                    )}
                    {invoice.status === 'overdue' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleSendReminder(invoice.invoice_number, invoice.client)}
                      >
                        Send Reminder
                      </Button>
                    )}
                  </div>
                </div>
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
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage client invoices
          </p>
        </div>
        <Button onClick={handleCreateInvoice}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="draft">
            Drafts ({mockInvoices.draft.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({mockInvoices.sent.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({mockInvoices.paid.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue ({mockInvoices.overdue.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draft" className="mt-6">
          {renderInvoiceList(mockInvoices.draft)}
        </TabsContent>
        <TabsContent value="sent" className="mt-6">
          {renderInvoiceList(mockInvoices.sent)}
        </TabsContent>
        <TabsContent value="paid" className="mt-6">
          {renderInvoiceList(mockInvoices.paid)}
        </TabsContent>
        <TabsContent value="overdue" className="mt-6">
          {renderInvoiceList(mockInvoices.overdue)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
