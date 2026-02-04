import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const staffOnboardingSchema = z.object({
  display_name: z.string().min(2, 'Display name is required'),
  bio: z.string().optional(),
  experience_years: z.number().min(0).max(50),
  city: z.string().min(2, 'City is required'),
  hourly_rate_min: z.number().min(0).optional(),
  hourly_rate_max: z.number().min(0).optional(),
})

type StaffOnboardingData = z.infer<typeof staffOnboardingSchema>

const skillOptions = [
  'Bartending',
  'Cocktails',
  'Wine Service',
  'Table Service',
  'Fine Dining',
  'Line Cook',
  'Prep Cook',
  'Grill',
  'Pastry',
  'Barista',
  'Host/Hostess',
  'Food Running',
  'POS Systems',
  'Cash Handling',
  'Customer Service',
]

export const Route = createFileRoute('/onboarding/staff')({
  component: StaffOnboardingPage,
})

function StaffOnboardingPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffOnboardingData>({
    resolver: zodResolver(staffOnboardingSchema),
    defaultValues: {
      experience_years: 0,
    },
  })

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    )
  }

  const onSubmit = async (data: StaffOnboardingData) => {
    setIsSubmitting(true)
    try {
      // TODO: Call API to save staff profile
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
            <CardTitle className="text-2xl">Complete your profile</CardTitle>
            <CardDescription>
              Tell us about yourself to help you find the perfect shifts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display name</Label>
                <Input
                  id="display_name"
                  placeholder="How you want to appear to companies"
                  {...register('display_name')}
                />
                {errors.display_name && (
                  <p className="text-sm text-destructive">{errors.display_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about your experience and what makes you great at hospitality work..."
                  rows={4}
                  {...register('bio')}
                />
              </div>

              <div className="space-y-2">
                <Label>Skills</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select all the skills that apply to you
                </p>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map((skill) => {
                    const isSelected = selectedSkills.includes(skill)
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors',
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {skill}
                        {isSelected && <X className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
                {selectedSkills.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedSkills.length} skill{selectedSkills.length !== 1 && 's'}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience_years">Years of experience</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    max="50"
                    {...register('experience_years')}
                  />
                  {errors.experience_years && (
                    <p className="text-sm text-destructive">{errors.experience_years.message}</p>
                  )}
                </div>

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
              </div>

              <div className="space-y-2">
                <Label>Hourly rate preference (optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="hourly_rate_min" className="text-xs text-muted-foreground">
                      Minimum
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        €
                      </span>
                      <Input
                        id="hourly_rate_min"
                        type="number"
                        min="0"
                        className="pl-7"
                        placeholder="12"
                        {...register('hourly_rate_min')}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hourly_rate_max" className="text-xs text-muted-foreground">
                      Maximum
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        €
                      </span>
                      <Input
                        id="hourly_rate_max"
                        type="number"
                        min="0"
                        className="pl-7"
                        placeholder="25"
                        {...register('hourly_rate_max')}
                      />
                    </div>
                  </div>
                </div>
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
                  Complete profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
