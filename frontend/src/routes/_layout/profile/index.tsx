import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { useStaffProfile } from '@/hooks/api/useStaffApi'
import { useCompanyProfile } from '@/hooks/api/useCompanyApi'
import { useAgencyProfile, useAgencyStats } from '@/hooks/api/useAgencyApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StarRating } from '@/components/Ratings/StarRating'
import { VerificationBadges } from '@/components/Verification/VerificationBadges'
import { MapPin, Calendar, Edit, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/_layout/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const navigate = useNavigate()
  const { user, userType } = useAuth()

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  // Fetch profile data based on user type
  const staffProfileQuery = useStaffProfile()
  const companyProfileQuery = useCompanyProfile()
  const agencyProfileQuery = useAgencyProfile()
  const agencyStatsQuery = useAgencyStats()

  // Determine loading and error states based on user type
  const isLoading =
    (userType === 'staff' && staffProfileQuery.isLoading) ||
    (userType === 'company' && companyProfileQuery.isLoading) ||
    (userType === 'agency' && (agencyProfileQuery.isLoading || agencyStatsQuery.isLoading))

  const hasError =
    (userType === 'staff' && staffProfileQuery.isError) ||
    (userType === 'company' && companyProfileQuery.isError) ||
    (userType === 'agency' && agencyProfileQuery.isError)

  // Get profile data
  const staffProfile = staffProfileQuery.data
  const companyProfile = companyProfileQuery.data
  const agencyProfile = agencyProfileQuery.data
  const agencyStats = agencyStatsQuery.data

  // Format member since date
  const formatMemberSince = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IE', { year: 'numeric', month: 'short' })
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
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
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <Button variant="outline" onClick={() => navigate({ to: '/settings' })}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <div>
                <p className="font-medium">Unable to load profile</p>
                <p className="text-sm">Please try refreshing the page or complete your profile setup.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <Button variant="outline" onClick={() => navigate({ to: '/settings' })}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      {userType === 'staff' && staffProfile && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar size="xl">
                  {staffProfile.avatar_url && <AvatarImage src={staffProfile.avatar_url} />}
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">
                      {staffProfile.display_name || user?.full_name || 'User'}
                    </h2>
                    {staffProfile.is_verified && (
                      <Badge variant="success">Verified</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {staffProfile.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {staffProfile.city}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <StarRating value={staffProfile.average_rating || 0} readonly size="sm" />
                      <span className="ml-1">{staffProfile.average_rating?.toFixed(1) || '0.0'} ({staffProfile.review_count || 0} reviews)</span>
                    </span>
                    {staffProfile.experience_years > 0 && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {staffProfile.experience_years} years exp.
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <VerificationBadges
                      isIdVerified={staffProfile.is_id_verified || false}
                      isBackgroundChecked={staffProfile.is_background_checked || false}
                      isRightToWorkVerified={staffProfile.is_right_to_work_verified ? true : 'pending'}
                      size="sm"
                      showLabels
                    />
                  </div>
                  {staffProfile.bio && (
                    <p className="mt-4 text-muted-foreground">
                      {staffProfile.bio}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {staffProfile.skills && staffProfile.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {staffProfile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{staffProfile.shifts_completed || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Shifts Completed</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{staffProfile.average_rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{staffProfile.review_count || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Fallback for staff when profile hasn't been set up yet */}
      {userType === 'staff' && !staffProfile && !isLoading && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar size="xl">
                  {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">
                      {user?.full_name || 'User'}
                    </h2>
                  </div>
                  <p className="mt-4 text-muted-foreground">
                    Complete your profile to start finding shifts.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => navigate({ to: '/onboarding/staff' })}
                  >
                    Complete Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {userType === 'company' && companyProfile && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <Avatar size="xl">
                  {companyProfile.logo_url && <AvatarImage src={companyProfile.logo_url} />}
                  <AvatarFallback className="text-xl">
                    {(companyProfile.company_name || user?.full_name || 'C')[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="text-xl font-semibold">
                      {companyProfile.company_name || user?.full_name}
                    </h2>
                    {companyProfile.is_verified && (
                      <Badge variant="success">Verified</Badge>
                    )}
                  </div>
                  {companyProfile.company_type && (
                    <p className="text-muted-foreground">
                      {companyProfile.company_type}
                    </p>
                  )}
                  {companyProfile.address && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="break-words">{companyProfile.address}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <StarRating value={companyProfile.average_rating || 0} readonly size="sm" />
                      <span className="ml-1">{companyProfile.average_rating?.toFixed(1) || '0.0'} ({companyProfile.review_count || 0} reviews)</span>
                    </span>
                  </div>
                  {companyProfile.description && (
                    <p className="mt-4 text-muted-foreground">
                      {companyProfile.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{companyProfile.shifts_posted || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Shifts Posted</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{companyProfile.average_rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{companyProfile.review_count || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Fallback for company when profile hasn't been set up yet */}
      {userType === 'company' && !companyProfile && !isLoading && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar size="xl">
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">
                      {user?.full_name || 'Company'}
                    </h2>
                  </div>
                  <p className="mt-4 text-muted-foreground">
                    Complete your company profile to start posting shifts.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => navigate({ to: '/onboarding/company' })}
                  >
                    Complete Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {userType === 'agency' && agencyProfile && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <Avatar size="xl">
                  {agencyProfile.logo_url && <AvatarImage src={agencyProfile.logo_url} />}
                  <AvatarFallback className="text-xl">
                    {(agencyProfile.agency_name || user?.full_name || 'A')[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="text-xl font-semibold">
                      {agencyProfile.agency_name || user?.full_name}
                    </h2>
                    {agencyProfile.is_verified && (
                      <Badge variant="success">Verified</Badge>
                    )}
                    {agencyProfile.mode && (
                      <Badge variant="secondary">{agencyProfile.mode}</Badge>
                    )}
                  </div>
                  {agencyProfile.address && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="break-words">{agencyProfile.address}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <StarRating value={agencyProfile.average_rating || 0} readonly size="sm" showValue />
                    </span>
                  </div>
                  {agencyProfile.description && (
                    <p className="mt-4 text-muted-foreground">
                      {agencyProfile.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{agencyStats?.staff_count || agencyProfile.staff_count || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Staff Members</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{agencyStats?.client_count || agencyProfile.client_count || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Clients</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{agencyProfile.average_rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Fallback for agency when profile hasn't been set up yet */}
      {userType === 'agency' && !agencyProfile && !isLoading && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar size="xl">
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">
                      {user?.full_name || 'Agency'}
                    </h2>
                  </div>
                  <p className="mt-4 text-muted-foreground">
                    Complete your agency profile to start managing staff and clients.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => navigate({ to: '/onboarding/agency' })}
                  >
                    Complete Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
