import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/Ratings/StarRating'
import { VerificationBadges } from '@/components/Verification/VerificationBadges'
import { MapPin, Calendar, Edit } from 'lucide-react'

export const Route = createFileRoute('/_layout/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user, userType } = useAuth()

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  // Mock profile data based on user type
  const mockStaffProfile = {
    display_name: user?.full_name || 'User',
    bio: 'Experienced hospitality professional with 5+ years in the industry. Specializing in bartending and customer service.',
    skills: ['Bartending', 'Cocktails', 'Wine Service', 'Customer Service', 'POS Systems'],
    experience_years: 5,
    city: 'Dublin',
    average_rating: 4.8,
    review_count: 32,
    shifts_completed: 48,
    member_since: '2025-06',
    isIdVerified: true,
    isBackgroundChecked: true,
    isRightToWorkVerified: 'pending' as const,
  }

  const mockCompanyProfile = {
    company_name: 'The Brazen Head',
    company_type: 'Bar / Pub',
    description: "Dublin's oldest pub, serving great food and drinks since 1198.",
    address: '20 Bridge Street Lower, Dublin 8',
    city: 'Dublin',
    average_rating: 4.8,
    review_count: 124,
    shifts_posted: 156,
    member_since: '2025-03',
  }

  const mockAgencyProfile = {
    agency_name: 'Dublin Staffing Solutions',
    mode: 'Full Intermediary',
    description: 'Premier hospitality staffing agency serving Dublin and surrounding areas.',
    address: '45 Grafton Street, Dublin 2',
    city: 'Dublin',
    average_rating: 4.7,
    staff_count: 45,
    client_count: 12,
    member_since: '2024-11',
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      {userType === 'staff' && (
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
                      {mockStaffProfile.display_name}
                    </h2>
                    {user?.is_verified && (
                      <Badge variant="success">Verified</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {mockStaffProfile.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <StarRating value={mockStaffProfile.average_rating} readonly size="sm" />
                      <span className="ml-1">{mockStaffProfile.average_rating} ({mockStaffProfile.review_count} reviews)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {mockStaffProfile.experience_years} years exp.
                    </span>
                  </div>
                  <div className="mt-3">
                    <VerificationBadges
                      isIdVerified={mockStaffProfile.isIdVerified}
                      isBackgroundChecked={mockStaffProfile.isBackgroundChecked}
                      isRightToWorkVerified={mockStaffProfile.isRightToWorkVerified}
                      size="sm"
                      showLabels
                    />
                  </div>
                  <p className="mt-4 text-muted-foreground">
                    {mockStaffProfile.bio}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mockStaffProfile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
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
                  <p className="text-xl sm:text-2xl font-bold">{mockStaffProfile.shifts_completed}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Shifts Completed</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{mockStaffProfile.average_rating}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{mockStaffProfile.review_count}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {userType === 'company' && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <Avatar size="xl">
                  <AvatarFallback className="text-xl">
                    {mockCompanyProfile.company_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="text-xl font-semibold">
                      {mockCompanyProfile.company_name}
                    </h2>
                    <Badge variant="success">Verified</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {mockCompanyProfile.company_type}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="break-words">{mockCompanyProfile.address}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <StarRating value={mockCompanyProfile.average_rating} readonly size="sm" />
                      <span className="ml-1">{mockCompanyProfile.average_rating} ({mockCompanyProfile.review_count} reviews)</span>
                    </span>
                  </div>
                  <p className="mt-4 text-muted-foreground">
                    {mockCompanyProfile.description}
                  </p>
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
                  <p className="text-xl sm:text-2xl font-bold">{mockCompanyProfile.shifts_posted}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Shifts Posted</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{mockCompanyProfile.average_rating}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{mockCompanyProfile.review_count}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {userType === 'agency' && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <Avatar size="xl">
                  <AvatarFallback className="text-xl">
                    {mockAgencyProfile.agency_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="text-xl font-semibold">
                      {mockAgencyProfile.agency_name}
                    </h2>
                    <Badge variant="success">Verified</Badge>
                    <Badge variant="secondary">{mockAgencyProfile.mode}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="break-words">{mockAgencyProfile.address}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <StarRating value={mockAgencyProfile.average_rating} readonly size="sm" showValue />
                    </span>
                  </div>
                  <p className="mt-4 text-muted-foreground">
                    {mockAgencyProfile.description}
                  </p>
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
                  <p className="text-xl sm:text-2xl font-bold">{mockAgencyProfile.staff_count}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Staff Members</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{mockAgencyProfile.client_count}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Clients</p>
                </div>
                <div className="p-2">
                  <p className="text-xl sm:text-2xl font-bold">{mockAgencyProfile.average_rating}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
