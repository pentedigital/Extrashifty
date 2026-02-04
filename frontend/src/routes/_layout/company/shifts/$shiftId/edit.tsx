import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export const Route = createFileRoute('/_layout/company/shifts/$shiftId/edit')({
  component: EditShiftPage,
})

function EditShiftPage() {
  const { shiftId } = Route.useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Mock existing shift data
  const [formData, setFormData] = useState({
    title: 'Bartender',
    description: 'Looking for an experienced bartender for a busy Friday night shift. Must have cocktail experience and be able to work in a fast-paced environment.',
    date: '2026-02-07',
    startTime: '18:00',
    endTime: '00:00',
    hourlyRate: '18',
    location: 'Temple Bar, Dublin 2',
    spotsTotal: '2',
    requirements: '2+ years bartending experience\nCocktail knowledge\nRSA certification',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    addToast({
      type: 'success',
      title: 'Shift updated',
      description: 'Your changes have been saved successfully.',
    })

    setIsSaving(false)
    navigate({ to: `/company/shifts/${shiftId}` })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/company/shifts/${shiftId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Shift</h1>
          <p className="text-muted-foreground">Shift #{shiftId}</p>
        </div>
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate (€)</Label>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  min="0"
                  step="0.50"
                  value={formData.hourlyRate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spotsTotal">Number of Workers Needed</Label>
                <Input
                  id="spotsTotal"
                  name="spotsTotal"
                  type="number"
                  min="1"
                  value={formData.spotsTotal}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements (one per line)</Label>
              <Textarea
                id="requirements"
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., 2+ years experience&#10;Food safety certification"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link to={`/company/shifts/${shiftId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
