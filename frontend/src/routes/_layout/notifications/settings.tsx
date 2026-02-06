import { useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Calendar,
  CreditCard,
  Megaphone,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/api/useNotificationsApi'

export const Route = createFileRoute('/_layout/notifications/settings')({
  component: NotificationSettingsPage,
})

interface NotificationSettingsForm {
  email_enabled: boolean
  push_enabled: boolean
  shift_updates: boolean
  payment_updates: boolean
  marketing: boolean
}

function NotificationSettingsPage() {
  const { addToast } = useToast()

  // Fetch preferences
  const { data: preferences, isLoading } = useNotificationPreferences()

  // Update mutation
  const updateMutation = useUpdateNotificationPreferences()

  // Form setup
  const { setValue, watch, handleSubmit, reset } = useForm<NotificationSettingsForm>({
    defaultValues: {
      email_enabled: true,
      push_enabled: true,
      shift_updates: true,
      payment_updates: true,
      marketing: false,
    },
  })

  // Update form when preferences load
  useEffect(() => {
    if (preferences) {
      reset({
        email_enabled: preferences.email_enabled,
        push_enabled: preferences.push_enabled,
        shift_updates: preferences.shift_updates,
        payment_updates: preferences.payment_updates,
        marketing: preferences.marketing,
      })
    }
  }, [preferences, reset])

  const formValues = watch()

  const onSubmit = async (data: NotificationSettingsForm) => {
    try {
      await updateMutation.mutateAsync(data)
      addToast({
        type: 'success',
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to save settings',
        description: 'Please try again.',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link to="/notifications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage how you receive notifications
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Delivery Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Delivery Methods
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label htmlFor="email_enabled" className="text-base font-medium cursor-pointer">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <Switch
                id="email_enabled"
                checked={formValues.email_enabled}
                onCheckedChange={(checked) => setValue('email_enabled', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label htmlFor="push_enabled" className="text-base font-medium cursor-pointer">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
              </div>
              <Switch
                id="push_enabled"
                checked={formValues.push_enabled}
                onCheckedChange={(checked) => setValue('push_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Categories</CardTitle>
            <CardDescription>
              Select which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100">
                  <Calendar className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <Label htmlFor="shift_updates" className="text-base font-medium cursor-pointer">
                    Shift Updates
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Applications, acceptances, reminders, and changes to shifts
                  </p>
                </div>
              </div>
              <Switch
                id="shift_updates"
                checked={formValues.shift_updates}
                onCheckedChange={(checked) => setValue('shift_updates', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <Label htmlFor="payment_updates" className="text-base font-medium cursor-pointer">
                    Payment Updates
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Payments received, wallet updates, and payout notifications
                  </p>
                </div>
              </div>
              <Switch
                id="payment_updates"
                checked={formValues.payment_updates}
                onCheckedChange={(checked) => setValue('payment_updates', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                  <Megaphone className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <Label htmlFor="marketing" className="text-base font-medium cursor-pointer">
                    Marketing
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    News, tips, and promotional content from ExtraShifty
                  </p>
                </div>
              </div>
              <Switch
                id="marketing"
                checked={formValues.marketing}
                onCheckedChange={(checked) => setValue('marketing', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Link to="/notifications">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
