import { createFileRoute, Link } from '@tanstack/react-router'
import { usePublicProfile } from '@/hooks/api/useUsersApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Star, Calendar, Shield, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/_layout/profile/$userId')({
  component: UserProfilePage,
})

function UserProfilePage() {
  const { userId } = Route.useParams()
  const { data: profile, isLoading, isError, error } = usePublicProfile(userId)

  // Format member since date
  const formatMemberSince = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IE', { year: 'numeric', month: 'short' })
  }

  // Get initials from name
  const getInitials = (name?: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Get user type label
  const getUserTypeLabel = (userType?: string) => {
    switch (userType) {
      case 'staff':
        return 'Staff Member'
      case 'company':
        return 'Company'
      case 'agency':
        return 'Agency'
      default:
        return 'User'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Skeleton className="h-8 w-24" />
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <div>
                <p className="font-medium">User not found</p>
                <p className="text-sm">
                  {error instanceof Error ? error.message : 'The requested profile could not be found.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar size="xl">
              <AvatarFallback className="text-2xl">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">{profile.full_name}</h2>
                {profile.is_verified && (
                  <Badge variant="success" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                <Badge variant="secondary">{getUserTypeLabel(profile.user_type)}</Badge>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {formatMemberSince(profile.created_at)}
                </span>
              </div>
              <p className="text-muted-foreground">
                This is a public profile view with limited information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Type</p>
              <p className="text-base">{getUserTypeLabel(profile.user_type)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="text-base">{formatMemberSince(profile.created_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Verification Status</p>
              <p className="text-base flex items-center gap-2">
                {profile.is_verified ? (
                  <>
                    <Star className="h-4 w-4 text-green-500" />
                    Verified Account
                  </>
                ) : (
                  'Not Yet Verified'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note about limited info */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            This is a public profile. Additional details like skills, ratings, and reviews
            are visible when viewing full staff or company profiles.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
