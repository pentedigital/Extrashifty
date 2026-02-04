import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Building2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export const Route = createFileRoute('/_layout/agency/shifts/create')({
  component: AgencyShiftCreatePage,
})

const mockClients = [
  { id: '1', name: 'Hotel ABC' },
  { id: '2', name: 'Café Central' },
  { id: '3', name: 'The Local Pub' },
]

function AgencyShiftCreatePage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    hourlyRate: '',
    location: '',
    spotsTotal: '1',
    requirements: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    addToast({
      type: 'success',
      title: 'Shift created',
      description: 'The shift has been created and is ready for staff assignment.',
    })

    setIsSaving(false)
    navigate({ to: '/agency/shifts' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link to="/agency/shifts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Shift</h1>
          <p className="text-muted-foreground">Create a new shift for a client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Client Selection</CardTitle>
            <CardDescription>Select which client this shift is for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client</Label>
              <select
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select a client...</option>
                {mockClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Shift Details</CardTitle>
            <CardDescription>Enter the details for this shift</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Bartender, Server, Line Cook"
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
                  placeholder="e.g., Temple Bar, Dublin 2"
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
                placeholder="Describe the shift requirements and expectations..."
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
                  placeholder="18.00"
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
          <Link to="/agency/shifts">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Creating...' : 'Create Shift'}
          </Button>
        </div>
      </form>
    </div>
  )
}
