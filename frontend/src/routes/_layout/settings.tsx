import { useState } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useUpdateProfile, useChangePassword, useDeleteAccount } from '@/hooks/api'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export const Route = createFileRoute('/_layout/settings')({
  component: SettingsPage,
})

// Validation schemas
const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name is too long'),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
}).refine((data) => data.current_password !== data.new_password, {
  message: "New password must be different from current password",
  path: ['new_password'],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // React Query mutations
  const updateProfileMutation = useUpdateProfile()
  const changePasswordMutation = useChangePassword()
  const deleteAccountMutation = useDeleteAccount()

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
    },
  })

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfileMutation.mutateAsync(data)
      addToast({
        type: 'success',
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.'
      addToast({
        type: 'error',
        title: 'Failed to update profile',
        description: message,
      })
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await changePasswordMutation.mutateAsync({
        current_password: data.current_password,
        new_password: data.new_password,
      })
      resetPasswordForm()
      addToast({
        type: 'success',
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please check your current password and try again.'
      addToast({
        type: 'error',
        title: 'Failed to update password',
        description: message,
      })
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccountMutation.mutateAsync()
      addToast({
        type: 'success',
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      })
      logout()
      navigate({ to: '/' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account. Please try again.'
      addToast({
        type: 'error',
        title: 'Failed to delete account',
        description: message,
      })
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
        <CardContent>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
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
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                {...registerProfile('full_name')}
              />
              {profileErrors.full_name && (
                <p className="text-sm text-destructive">{profileErrors.full_name.message}</p>
              )}
            </div>

            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  {...registerPassword('current_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.current_password && (
                <p className="text-sm text-destructive">{passwordErrors.current_password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  {...registerPassword('new_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
              {passwordErrors.new_password && (
                <p className="text-sm text-destructive">{passwordErrors.new_password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                {...registerPassword('confirm_password')}
              />
              {passwordErrors.confirm_password && (
                <p className="text-sm text-destructive">{passwordErrors.confirm_password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Control how and when you receive notifications about shifts, payments, and more.
          </p>
          <Link to="/notifications/settings">
            <Button variant="outline">
              Manage Notification Settings
            </Button>
          </Link>
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
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
