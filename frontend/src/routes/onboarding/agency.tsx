import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import type { AgencyMode } from '@/types/agency'

const agencyOnboardingSchema = z.object({
  agency_name: z.string().min(2, 'Agency name is required'),
  description: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  contact_email: z.string().email('Please enter a valid email'),
  contact_phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

type AgencyOnboardingData = z.infer<typeof agencyOnboardingSchema>

const agencyModes: { mode: AgencyMode; label: string; description: string }[] = [
  {
    mode: 'staff_provider',
    label: 'Staff Provider',
    description: 'Place your staff in shifts posted by other businesses on the marketplace',
  },
  {
    mode: 'full_intermediary',
    label: 'Full Intermediary',
    description: 'Manage client businesses, post shifts on their behalf, and handle all staffing',
  },
]

export const Route = createFileRoute('/onboarding/agency')({
  component: AgencyOnboardingPage,
})

function AgencyOnboardingPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedMode, setSelectedMode] = useState<AgencyMode>('staff_provider')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AgencyOnboardingData>({
    resolver: zodResolver(agencyOnboardingSchema),
  })

  const onSubmit = async (data: AgencyOnboardingData) => {
    setIsSubmitting(true)
    try {
      // Call API to save agency profile
      await api.agency.updateProfile({
        agency_name: data.agency_name,
        mode: selectedMode,
        description: data.description,
        address: data.address,
        city: data.city,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        website: data.website || undefined,
      })

      addToast({
        type: 'success',
        title: 'Agency setup complete',
        description: 'Your agency profile has been set up successfully.',
      })

      navigate({ to: '/dashboard' })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Setup failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set up your agency</CardTitle>
            <CardDescription>
              Configure your agency to start managing staff and clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <Label>Agency mode</Label>
                <div className="grid gap-3">
                  {agencyModes.map((modeOption) => {
                    const isSelected = selectedMode === modeOption.mode
                    return (
                      <button
                        key={modeOption.mode}
                        type="button"
                        onClick={() => setSelectedMode(modeOption.mode)}
                        className={cn(
                          'flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all',
                          isSelected
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-border hover:border-brand-300 hover:bg-muted/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full border-2 mt-0.5',
                            isSelected
                              ? 'border-brand-600 bg-brand-600'
                              : 'border-muted-foreground'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{modeOption.label}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {modeOption.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agency_name">Agency name</Label>
                <Input
                  id="agency_name"
                  placeholder="Your agency name"
                  {...register('agency_name')}
                />
                {errors.agency_name && (
                  <p className="text-sm text-destructive">{errors.agency_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell clients and staff about your agency..."
                  rows={3}
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street"
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Dublin"
                    {...register('city')}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone (optional)</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    placeholder="+353 1 234 5678"
                    {...register('contact_phone')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="contact@youragency.com"
                  {...register('contact_email')}
                />
                {errors.contact_email && (
                  <p className="text-sm text-destructive">{errors.contact_email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://www.youragency.com"
                  {...register('website')}
                />
                {errors.website && (
                  <p className="text-sm text-destructive">{errors.website.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: '/' })}
                  className="flex-1"
                >
                  Skip for now
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete setup
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
