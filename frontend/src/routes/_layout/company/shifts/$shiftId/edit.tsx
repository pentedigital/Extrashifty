import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowLeft, Save, AlertCircle, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useShift, useUpdateShift, useDeleteShift } from '@/hooks/api/useShiftsApi'

export const Route = createFileRoute('/_layout/company/shifts/$shiftId/edit')({
  component: EditShiftPage,
})

const shiftTypes = [
  { value: 'bar', label: 'Bar / Bartender' },
  { value: 'server', label: 'Server / Waiter' },
  { value: 'kitchen', label: 'Kitchen Staff' },
  { value: 'chef', label: 'Chef' },
  { value: 'host', label: 'Host / Hostess' },
  { value: 'general', label: 'General' },
]

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'cancelled', label: 'Cancelled' },
]

// Zod schemas for validation
const shiftTypeSchema = z.enum(['bar', 'server', 'kitchen', 'chef', 'host', 'general'])
const statusSchema = z.enum(['draft', 'open', 'cancelled'])

function EditShiftPage() {
  const { shiftId } = Route.useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  // Fetch shift data
  const { data: shift, isLoading, error } = useShift(shiftId)

  // Mutations
  const updateShift = useUpdateShift()
  const deleteShift = useDeleteShift()

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shift_type: '',
    date: '',
    start_time: '',
    end_time: '',
    hourly_rate: '',
    location_name: '',
    address: '',
    city: '',
    spots_total: '1',
    status: 'open',
  })

  // Populate form when shift data loads
  useEffect(() => {
    if (shift) {
      setFormData({
        title: shift.title || '',
        description: shift.description || '',
        shift_type: shift.shift_type || '',
        date: shift.date || '',
        start_time: shift.start_time || '',
        end_time: shift.end_time || '',
        hourly_rate: String(shift.hourly_rate || ''),
        location_name: shift.location_name || '',
        address: shift.address || '',
        city: shift.city || '',
        spots_total: String(shift.spots_total || 1),
        status: shift.status || 'open',
      })
    }
  }, [shift])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate shift_type and status using Zod
    const shiftTypeResult = shiftTypeSchema.safeParse(formData.shift_type)
    const statusResult = statusSchema.safeParse(formData.status)

    if (!shiftTypeResult.success) {
      addToast({
        type: 'error',
        title: 'Invalid shift type',
        description: 'Please select a valid shift type.',
      })
      return
    }

    if (!statusResult.success) {
      addToast({
        type: 'error',
        title: 'Invalid status',
        description: 'Please select a valid status.',
      })
      return
    }

    try {
      await updateShift.mutateAsync({
        id: shiftId,
        data: {
          title: formData.title,
          description: formData.description,
          shift_type: shiftTypeResult.data,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          hourly_rate: parseFloat(formData.hourly_rate),
          location_name: formData.location_name,
          address: formData.address,
          city: formData.city,
          spots_total: parseInt(formData.spots_total),
          status: statusResult.data,
        },
      })

      addToast({
        type: 'success',
        title: 'Shift updated',
        description: 'Your changes have been saved successfully.',
      })

      navigate({ to: '/company/shifts' })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to update shift',
        description: 'Please try again or contact support if the problem persists.',
      })
    }
  }

  const handleDelete = async () => {
    try {
      await deleteShift.mutateAsync(shiftId)

      addToast({
        type: 'success',
        title: 'Shift deleted',
        description: 'The shift has been removed.',
      })

      navigate({ to: '/company/shifts' })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to delete shift',
        description: 'Please try again or contact support if the problem persists.',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !shift) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/company/shifts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Shift</h1>
          </div>
        </div>
        <EmptyState
          icon={AlertCircle}
          title="Shift not found"
          description="This shift may have been removed or you don't have permission to view it."
        />
      </div>
    )
  }

  const canEdit = shift.status === 'draft' || shift.status === 'open'
  const canDelete = shift.status === 'draft' || (shift.status === 'open' && shift.spots_filled === 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/company/shifts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Shift</h1>
            <p className="text-muted-foreground">{shift.title}</p>
          </div>
        </div>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Shift</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this shift? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleteShift.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Shift Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift_type">Shift Type</Label>
                <Select
                  id="shift_type"
                  name="shift_type"
                  options={shiftTypes}
                  value={formData.shift_type}
                  onChange={handleChange}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                disabled={!canEdit}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={handleChange}
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={handleChange}
                  disabled={!canEdit}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="location_name">Location Name</Label>
                <Input
                  id="location_name"
                  name="location_name"
                  value={formData.location_name}
                  onChange={handleChange}
                  placeholder="e.g., The Brazen Head"
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="20 Bridge Street Lower"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Dublin"
                  disabled={!canEdit}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    EUR
                  </span>
                  <Input
                    id="hourly_rate"
                    name="hourly_rate"
                    type="number"
                    min="0"
                    step="0.50"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    className="pl-12"
                    disabled={!canEdit}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spots_total">Number of Workers</Label>
                <Input
                  id="spots_total"
                  name="spots_total"
                  type="number"
                  min="1"
                  value={formData.spots_total}
                  onChange={handleChange}
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  name="status"
                  options={statusOptions}
                  value={formData.status}
                  onChange={handleChange}
                />
              </div>
            </div>

            {!canEdit && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                This shift cannot be edited because it has already been assigned or is in progress.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link to="/company/shifts">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateShift.isPending || !canEdit}>
            {updateShift.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {updateShift.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
