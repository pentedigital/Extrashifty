import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { api, ApiClientError } from '@/lib/api'

const recoverSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type RecoverFormData = z.infer<typeof recoverSchema>

export const Route = createFileRoute('/recover-password')({
  component: RecoverPasswordPage,
})

function RecoverPasswordPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoverFormData>({
    resolver: zodResolver(recoverSchema),
  })

  const onSubmit = async (data: RecoverFormData) => {
    setIsSubmitting(true)
    try {
      await api.auth.passwordRecovery(data.email)
      setIsSuccess(true)
    } catch (error) {
      // Even on error, we show success to prevent email enumeration attacks
      // The backend should also handle this, but we add it here as well
      if (error instanceof ApiClientError && error.status === 404) {
        // User not found - still show success message
        setIsSuccess(true)
      } else {
        const message = error instanceof ApiClientError
          ? error.message
          : 'Failed to send recovery email. Please try again.'
        addToast({
          type: 'error',
          title: 'Request failed',
          description: message,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>
            {isSuccess
              ? "We've sent you a password reset link"
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-success/5 border border-success/30 p-4 text-sm text-success">
                <p>
                  Check your email for a link to reset your password. If it
                  doesn't appear within a few minutes, check your spam folder.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate({ to: '/login' })}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate({ to: '/login' })}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
