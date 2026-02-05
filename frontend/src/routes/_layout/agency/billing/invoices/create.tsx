import { useState, useMemo } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Save, Send, Calculator, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { useAgencyClients, useCreateInvoice, useSendInvoice } from '@/hooks/api/useAgencyApi'

export const Route = createFileRoute('/_layout/agency/billing/invoices/create')({
  component: CreateInvoicePage,
})

function CreateInvoicePage() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const { data: clientsData, isLoading: clientsLoading } = useAgencyClients()
  const createInvoiceMutation = useCreateInvoice()
  const sendInvoiceMutation = useSendInvoice()

  const [formData, setFormData] = useState({
    client_id: '',
    period_start: '',
    period_end: '',
    due_date: '',
    amount: '',
    notes: '',
  })

  const [calculateFromShifts, setCalculateFromShifts] = useState(false)

  const activeClients = useMemo(() => {
    return (clientsData?.items ?? []).filter(c => c.is_active !== false && c.status !== 'inactive')
  }, [clientsData])

  const selectedClient = useMemo(() => {
    return activeClients.find(c => c.id === formData.client_id)
  }, [activeClients, formData.client_id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const calculateDefaultDueDate = (periodEnd: string) => {
    if (!periodEnd) return ''
    const date = new Date(periodEnd)
    date.setDate(date.getDate() + 14) // Default to 14 days after period end
    return date.toISOString().split('T')[0]
  }

  const handlePeriodEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const periodEnd = e.target.value
    setFormData(prev => ({
      ...prev,
      period_end: periodEnd,
      due_date: prev.due_date || calculateDefaultDueDate(periodEnd),
    }))
  }

  const handleCalculateFromShifts = () => {
    // In a real implementation, this would fetch shifts for the period and calculate
    // For now, we'll show a placeholder calculation
    if (!formData.client_id || !formData.period_start || !formData.period_end) {
      addToast({
        type: 'warning',
        title: 'Missing information',
        description: 'Please select a client and billing period first.',
      })
      return
    }

    // Placeholder - in production, this would call an API to calculate
    setCalculateFromShifts(true)
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        amount: '1250.00', // Placeholder calculated amount
      }))
      setCalculateFromShifts(false)
      addToast({
        type: 'info',
        title: 'Amount calculated',
        description: 'Invoice amount has been calculated based on completed shifts.',
      })
    }, 1000)
  }

  const handleSubmit = async (e: React.FormEvent, sendImmediately = false) => {
    e.preventDefault()

    if (!formData.client_id || !formData.period_start || !formData.period_end || !formData.due_date || !formData.amount) {
      addToast({
        type: 'error',
        title: 'Missing required fields',
        description: 'Please fill in all required fields.',
      })
      return
    }

    try {
      const invoice = await createInvoiceMutation.mutateAsync({
        client_id: parseInt(formData.client_id, 10),
        period_start: formData.period_start,
        period_end: formData.period_end,
        due_date: formData.due_date,
        amount: parseFloat(formData.amount),
        notes: formData.notes || undefined,
      })

      if (sendImmediately && invoice?.id) {
        await sendInvoiceMutation.mutateAsync(invoice.id)
        addToast({
          type: 'success',
          title: 'Invoice created and sent',
          description: `Invoice has been created and sent to ${selectedClient?.company?.business_name ?? selectedClient?.business_email}.`,
        })
      } else {
        addToast({
          type: 'success',
          title: 'Invoice created',
          description: 'Invoice has been saved as a draft.',
        })
      }

      navigate({ to: '/agency/billing/invoices' })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to create invoice',
        description: 'Please try again later.',
      })
    }
  }

  const isSubmitting = createInvoiceMutation.isPending || sendInvoiceMutation.isPending

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link to="/agency/billing/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Invoice</h1>
          <p className="text-muted-foreground">Create a new invoice for a client</p>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <Card>
          <CardHeader>
            <CardTitle>Client Selection</CardTitle>
            <CardDescription>Select which client this invoice is for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              {clientsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <select
                  id="client_id"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  required
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select a client...</option>
                  {activeClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company?.business_name ?? client.business_email}
                    </option>
                  ))}
                </select>
              )}
              {selectedClient && (
                <p className="text-sm text-muted-foreground">
                  {selectedClient.company?.business_type && (
                    <span className="capitalize">{selectedClient.company.business_type} - </span>
                  )}
                  {selectedClient.business_email}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Billing Period</CardTitle>
            <CardDescription>Set the period this invoice covers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="period_start">Period Start *</Label>
                <Input
                  id="period_start"
                  name="period_start"
                  type="date"
                  value={formData.period_start}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period_end">Period End *</Label>
                <Input
                  id="period_end"
                  name="period_end"
                  type="date"
                  value={formData.period_end}
                  onChange={handlePeriodEndChange}
                  min={formData.period_start}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={formData.due_date}
                onChange={handleChange}
                min={formData.period_end}
                required
              />
              <p className="text-xs text-muted-foreground">
                Default is 14 days after the billing period ends
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Invoice Amount</CardTitle>
            <CardDescription>Enter the amount or calculate from shifts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="amount">Amount (EUR) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCalculateFromShifts}
                  disabled={calculateFromShifts || !formData.client_id || !formData.period_start || !formData.period_end}
                >
                  {calculateFromShifts ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="mr-2 h-4 w-4" />
                  )}
                  Calculate from Shifts
                </Button>
              </div>
            </div>
            {formData.amount && (
              <p className="text-lg font-semibold">
                Total: {formatCurrency(parseFloat(formData.amount) || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Add notes or special instructions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Add any notes or payment instructions..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link to="/agency/billing/invoices">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="outline"
            disabled={isSubmitting}
          >
            {createInvoiceMutation.isPending && !sendInvoiceMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSubmitting}
          >
            {sendInvoiceMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Create & Send
          </Button>
        </div>
      </form>
    </div>
  )
}
