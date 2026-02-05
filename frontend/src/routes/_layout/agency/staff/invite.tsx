import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, Mail, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { api, ApiClientError } from '@/lib/api'

export const Route = createFileRoute('/_layout/agency/staff/invite')({
  component: InviteStaffPage,
})

const inviteSchema = z.object({
  message: z.string().optional(),
})

type InviteFormData = z.infer<typeof inviteSchema>

function InviteStaffPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  const { register, handleSubmit } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  })

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase()
    setEmailError(null)

    if (!email) return

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    if (emails.includes(email)) {
      setEmailError('This email has already been added')
      return
    }

    setEmails([...emails, email])
    setEmailInput('')
  }

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addEmail()
    }
  }

  const onSubmit = async (data: InviteFormData) => {
    if (emails.length === 0) {
      setEmailError('Please add at least one email address')
      return
    }

    setIsSubmitting(true)
    try {
      await api.agency.inviteStaff({
        emails,
        message: data.message,
      })
      addToast({
        type: 'success',
        title: 'Invitations sent',
        description: `Successfully sent ${emails.length} invitation${emails.length !== 1 ? 's' : ''}.`,
      })
      navigate({ to: '/agency/staff' })
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Failed to send invitations'
      addToast({
        type: 'error',
        title: 'Error',
        description: message,
      })
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
          onClick={() => navigate({ to: '/agency/staff' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Invite Staff</h1>
          <p className="text-muted-foreground">
            Send invitations to freelancers to join your agency
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Invitations
          </CardTitle>
          <CardDescription>
            Enter the email addresses of freelancers you want to invite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Addresses</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="freelancer@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" variant="outline" onClick={addEmail}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            {emails.length > 0 && (
              <div className="space-y-2">
                <Label>Recipients ({emails.length})</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted">
                  {emails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to your invitation..."
                rows={4}
                {...register('message')}
              />
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-medium mb-2">What happens next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Recipients will receive an email invitation</li>
                <li>• They can accept and join your agency staff pool</li>
                <li>• You'll be notified when they accept</li>
                <li>• You can then assign them to shifts</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/agency/staff' })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || emails.length === 0}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send {emails.length > 0 ? `${emails.length} ` : ''}Invitation
                {emails.length !== 1 && 's'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
