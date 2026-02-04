import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { cn, formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useCreateShift } from '@/hooks/api'

export const Route = createFileRoute('/_layout/company/shifts/create')({
  component: CreateShiftPage,
})

const shiftTypes = [
  { value: 'bar', label: 'Bar / Bartender' },
  { value: 'server', label: 'Server / Waiter' },
  { value: 'kitchen', label: 'Kitchen Staff' },
  { value: 'chef', label: 'Chef' },
  { value: 'host', label: 'Host / Hostess' },
  { value: 'general', label: 'General' },
]

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

const basicInfoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  shift_type: z.string().min(1, 'Please select a shift type'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
})

const scheduleSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  location_name: z.string().min(2, 'Location name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
})

const requirementsSchema = z.object({
  hourly_rate: z.number().min(1, 'Hourly rate is required'),
  spots_total: z.number().min(1, 'At least 1 spot required'),
})

type BasicInfoData = z.infer<typeof basicInfoSchema>
type ScheduleData = z.infer<typeof scheduleSchema>
type RequirementsData = z.infer<typeof requirementsSchema>

const steps = ['Basic Info', 'Schedule', 'Requirements', 'Review']

function CreateShiftPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const createShift = useCreateShift()

  // Form state for each step
  const [basicInfo, setBasicInfo] = useState<BasicInfoData | null>(null)
  const [schedule, setSchedule] = useState<ScheduleData | null>(null)
  const [requirements, setRequirements] = useState<RequirementsData | null>(null)

  const basicInfoForm = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: basicInfo || undefined,
  })

  const scheduleForm = useForm<ScheduleData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: schedule || undefined,
  })

  const requirementsForm = useForm<RequirementsData>({
    resolver: zodResolver(requirementsSchema),
    defaultValues: requirements || { spots_total: 1 },
  })

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      const valid = await basicInfoForm.trigger()
      if (valid) {
        setBasicInfo(basicInfoForm.getValues())
        setCurrentStep(1)
      }
    } else if (currentStep === 1) {
      const valid = await scheduleForm.trigger()
      if (valid) {
        setSchedule(scheduleForm.getValues())
        setCurrentStep(2)
      }
    } else if (currentStep === 2) {
      const valid = await requirementsForm.trigger()
      if (valid) {
        setRequirements(requirementsForm.getValues())
        setCurrentStep(3)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!basicInfo || !schedule || !requirements) return

    const duration = calculateDuration()
    const shiftData = {
      ...basicInfo,
      ...schedule,
      ...requirements,
      duration_hours: duration,
      total_pay: requirements.hourly_rate * duration,
      required_skills: selectedSkills,
      status: 'open' as const,
      currency: 'EUR',
    }

    try {
      await createShift.mutateAsync(shiftData)
      addToast({
        type: 'success',
        title: 'Shift created successfully',
        description: `Your shift "${basicInfo.title}" has been published to the marketplace.`,
      })
      navigate({ to: '/company/shifts' })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to create shift',
        description: 'Please try again or contact support if the problem persists.',
      })
    }
  }

  const calculateDuration = () => {
    if (!schedule?.start_time || !schedule?.end_time) return 0
    const [startH, startM] = schedule.start_time.split(':').map(Number)
    const [endH, endM] = schedule.end_time.split(':').map(Number)
    let duration = (endH * 60 + endM) - (startH * 60 + startM)
    if (duration < 0) duration += 24 * 60 // Overnight shift
    return duration / 60
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/company/shifts' })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Shift</h1>
          <p className="text-muted-foreground">Post a new shift for workers to apply</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                index < currentStep
                  ? 'bg-brand-600 text-white'
                  : index === currentStep
                  ? 'bg-brand-100 text-brand-700 border-2 border-brand-600'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-1 w-12 sm:w-24 mx-2',
                  index < currentStep ? 'bg-brand-600' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center font-medium">{steps[currentStep]}</p>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 0 && (
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Shift Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Bartender - Friday Night"
                  {...basicInfoForm.register('title')}
                />
                {basicInfoForm.formState.errors.title && (
                  <p className="text-sm text-destructive">
                    {basicInfoForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift_type">Shift Type</Label>
                <Select
                  options={shiftTypes}
                  placeholder="Select a type"
                  {...basicInfoForm.register('shift_type')}
                />
                {basicInfoForm.formState.errors.shift_type && (
                  <p className="text-sm text-destructive">
                    {basicInfoForm.formState.errors.shift_type.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the shift, responsibilities, and any requirements..."
                  rows={5}
                  {...basicInfoForm.register('description')}
                />
                {basicInfoForm.formState.errors.description && (
                  <p className="text-sm text-destructive">
                    {basicInfoForm.formState.errors.description.message}
                  </p>
                )}
              </div>
            </form>
          )}

          {currentStep === 1 && (
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  {...scheduleForm.register('date')}
                />
                {scheduleForm.formState.errors.date && (
                  <p className="text-sm text-destructive">
                    {scheduleForm.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    {...scheduleForm.register('start_time')}
                  />
                  {scheduleForm.formState.errors.start_time && (
                    <p className="text-sm text-destructive">
                      {scheduleForm.formState.errors.start_time.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    {...scheduleForm.register('end_time')}
                  />
                  {scheduleForm.formState.errors.end_time && (
                    <p className="text-sm text-destructive">
                      {scheduleForm.formState.errors.end_time.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_name">Location Name</Label>
                <Input
                  id="location_name"
                  placeholder="e.g., The Brazen Head"
                  {...scheduleForm.register('location_name')}
                />
                {scheduleForm.formState.errors.location_name && (
                  <p className="text-sm text-destructive">
                    {scheduleForm.formState.errors.location_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="20 Bridge Street Lower"
                  {...scheduleForm.register('address')}
                />
                {scheduleForm.formState.errors.address && (
                  <p className="text-sm text-destructive">
                    {scheduleForm.formState.errors.address.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Dublin"
                  {...scheduleForm.register('city')}
                />
                {scheduleForm.formState.errors.city && (
                  <p className="text-sm text-destructive">
                    {scheduleForm.formState.errors.city.message}
                  </p>
                )}
              </div>
            </form>
          )}

          {currentStep === 2 && (
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      €
                    </span>
                    <Input
                      id="hourly_rate"
                      type="number"
                      min="1"
                      className="pl-7"
                      placeholder="18"
                      {...requirementsForm.register('hourly_rate')}
                    />
                  </div>
                  {requirementsForm.formState.errors.hourly_rate && (
                    <p className="text-sm text-destructive">
                      {requirementsForm.formState.errors.hourly_rate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spots_total">Number of Workers</Label>
                  <Input
                    id="spots_total"
                    type="number"
                    min="1"
                    max="20"
                    {...requirementsForm.register('spots_total')}
                  />
                  {requirementsForm.formState.errors.spots_total && (
                    <p className="text-sm text-destructive">
                      {requirementsForm.formState.errors.spots_total.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Required Skills (optional)</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select skills that are required for this shift
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
              </div>
            </form>
          )}

          {currentStep === 3 && basicInfo && schedule && requirements && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{basicInfo.title}</h3>
                  <Badge className="mt-1">
                    {shiftTypes.find((t) => t.value === basicInfo.shift_type)?.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {formatDate(schedule.date)}
                    </p>
                    <p>
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{schedule.location_name}</p>
                    <p>{schedule.address}, {schedule.city}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Pay</p>
                    <p className="font-medium text-brand-600">
                      {formatCurrency(requirements.hourly_rate)}/hr
                    </p>
                    <p className="text-muted-foreground">
                      ~{formatCurrency(requirements.hourly_rate * calculateDuration())} total
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Workers Needed</p>
                    <p className="font-medium">{requirements.spots_total}</p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-2">Description</p>
                  <p className="text-sm">{basicInfo.description}</p>
                </div>

                {selectedSkills.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSkills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {currentStep < 3 ? (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createShift.isPending}>
            {createShift.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish Shift
          </Button>
        )}
      </div>
    </div>
  )
}
