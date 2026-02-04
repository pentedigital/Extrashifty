import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_layout/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const handleSaveName = async () => {
    setIsSavingName(true)
    try {
      // TODO: Call API to update name
      await new Promise(resolve => setTimeout(resolve, 1000))
      addToast({
        type: 'success',
        title: 'Name updated',
        description: 'Your name has been saved successfully.',
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to update name',
        description: 'Please try again.',
      })
    } finally {
      setIsSavingName(false)
    }
  }

  const handleUpdatePassword = async () => {
    setIsSavingPassword(true)
    try {
      // TODO: Call API to update password
      await new Promise(resolve => setTimeout(resolve, 1000))
      addToast({
        type: 'success',
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to update password',
        description: 'Please check your current password and try again.',
      })
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Update your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Contact support to change your email address
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              defaultValue={user?.full_name || ''}
            />
          </div>

          <Button onClick={handleSaveName} disabled={isSavingName}>
            {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password</Label>
            <Input id="current_password" type="password" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <Input id="new_password" type="password" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input id="confirm_password" type="password" />
          </div>

          <Button onClick={handleUpdatePassword} disabled={isSavingPassword}>
            {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Notification settings coming soon.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all your data from our servers, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your profile information</li>
                <li>All shift history and applications</li>
                <li>Wallet balance and transaction history</li>
                <li>Reviews and ratings</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                setIsDeleting(true)
                try {
                  // TODO: Call API to delete account
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  logout()
                  navigate({ to: '/' })
                } catch (error) {
                  // Error handled silently
                } finally {
                  setIsDeleting(false)
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
