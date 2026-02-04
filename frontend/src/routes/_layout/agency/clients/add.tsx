import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_layout/agency/clients/add')({
  component: AddClientPage,
})

const addClientSchema = z.object({
  business_email: z.string().email('Please enter a valid email address'),
  billing_rate_markup: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})

type AddClientFormData = z.infer<typeof addClientSchema>

function AddClientPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddClientFormData>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      billing_rate_markup: 15,
    },
  })

  const onSubmit = async (_data: AddClientFormData) => {
    setIsSubmitting(true)
    try {
      // TODO: Call API to add client
      await new Promise((resolve) => setTimeout(resolve, 1000))
      navigate({ to: '/agency/clients' })
    } catch {
      // Error handled silently
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/agency/clients' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Client</h1>
          <p className="text-muted-foreground">
            Onboard a new business as a client
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Client Details
          </CardTitle>
          <CardDescription>
            Send an invitation to a business to become your client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="business_email">Business Email</Label>
              <Input
                id="business_email"
                type="email"
                placeholder="contact@business.com"
                {...register('business_email')}
              />
              {errors.business_email && (
                <p className="text-sm text-destructive">
                  {errors.business_email.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The business owner will receive an invitation to connect with
                your agency
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_rate_markup">Rate Markup (%)</Label>
              <div className="relative w-32">
                <Input
                  id="billing_rate_markup"
                  type="number"
                  min="0"
                  max="100"
                  {...register('billing_rate_markup')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              {errors.billing_rate_markup && (
                <p className="text-sm text-destructive">
                  {errors.billing_rate_markup.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Your markup on top of staff hourly rates when billing this client
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any notes about this client relationship..."
                rows={3}
                {...register('notes')}
              />
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-medium mb-2">How it works</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• The business will receive an invitation email</li>
                <li>• They can accept to become your client</li>
                <li>• You can then create shifts on their behalf</li>
                <li>• Invoices are generated based on completed shifts</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate({ to: '/agency/clients' })}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
