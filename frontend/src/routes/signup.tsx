import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, User, Building2, Users, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { UserType } from '@/types/user'

const signupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

type SignupFormData = z.infer<typeof signupSchema>

const userTypes: { type: UserType; label: string; description: string; icon: React.ElementType }[] = [
  {
    type: 'staff',
    label: 'Staff',
    description: 'Find shifts and earn money with flexible hours',
    icon: User,
  },
  {
    type: 'company',
    label: 'Company',
    description: 'Post shifts and find qualified workers',
    icon: Building2,
  },
  {
    type: 'agency',
    label: 'Agency',
    description: 'Manage staff and client relationships',
    icon: Users,
  },
]

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const { register: registerUser, error, clearError } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedType, setSelectedType] = useState<UserType | null>(null)
  const [step, setStep] = useState<'type' | 'details'>('type')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    if (!selectedType) return

    clearError()
    setIsSubmitting(true)
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        user_type: selectedType,
      })
      // Navigate to onboarding based on user type
      navigate({ to: `/onboarding/${selectedType}` })
    } catch {
      // Error is handled by useAuth
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Logo size="lg" showText={false} className="mx-auto mb-4" />
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            {step === 'type'
              ? 'How do you want to use ExtraShifty?'
              : 'Enter your details to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'type' ? (
            <div className="space-y-4">
              {userTypes.map((userType) => {
                const Icon = userType.icon
                const isSelected = selectedType === userType.type
                return (
                  <button
                    key={userType.type}
                    type="button"
                    onClick={() => setSelectedType(userType.type)}
                    className={cn(
                      'w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all',
                      isSelected
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-border hover:border-brand-300 hover:bg-muted/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{userType.label}</p>
                        {isSelected && (
                          <Check className="h-5 w-5 text-brand-600" />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {userType.description}
                      </p>
                    </div>
                  </button>
                )
              })}

              <Button
                type="button"
                className="w-full mt-6"
                disabled={!selectedType}
                onClick={() => setStep('details')}
              >
                Continue
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...register('full_name')}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  {...register('confirm_password')}
                />
                {errors.confirm_password && (
                  <p className="text-sm text-destructive">{errors.confirm_password.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('type')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
