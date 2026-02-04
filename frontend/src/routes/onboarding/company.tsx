import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const companyOnboardingSchema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
  company_type: z.string().min(1, 'Please select a company type'),
  description: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

type CompanyOnboardingData = z.infer<typeof companyOnboardingSchema>

const companyTypes = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar / Pub' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'cafe', label: 'Café' },
  { value: 'catering', label: 'Catering' },
  { value: 'events', label: 'Events / Nightclub' },
  { value: 'other', label: 'Other' },
]

export const Route = createFileRoute('/onboarding/company')({
  component: CompanyOnboardingPage,
})

function CompanyOnboardingPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyOnboardingData>({
    resolver: zodResolver(companyOnboardingSchema),
  })

  const onSubmit = async (data: CompanyOnboardingData) => {
    setIsSubmitting(true)
    try {
      // TODO: Call API to save company profile
      navigate({ to: '/' })
    } catch (error) {
      // Error handled silently
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set up your company</CardTitle>
            <CardDescription>
              Tell us about your company to start posting shifts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company name</Label>
                <Input
                  id="company_name"
                  placeholder="Your company name"
                  {...register('company_name')}
                />
                {errors.company_name && (
                  <p className="text-sm text-destructive">{errors.company_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_type">Company type</Label>
                <Select
                  id="company_type"
                  options={companyTypes}
                  placeholder="Select a type"
                  {...register('company_type')}
                />
                {errors.company_type && (
                  <p className="text-sm text-destructive">{errors.company_type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell workers about your company..."
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
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+353 1 234 5678"
                    {...register('phone')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://www.yourcompany.com"
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
