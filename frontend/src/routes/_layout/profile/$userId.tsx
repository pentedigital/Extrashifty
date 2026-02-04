import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Star, MapPin, Calendar, Shield, CheckCircle } from 'lucide-react'

export const Route = createFileRoute('/_layout/profile/$userId')({
  component: UserProfilePage,
})

// Mock user data - in real app would fetch based on userId
const mockUserProfile = {
  id: '1',
  name: 'John Doe',
  type: 'staff',
  bio: 'Experienced hospitality professional with 5+ years in the industry. Specializing in bartending and customer service.',
  city: 'Dublin',
  memberSince: '2025-06',
  rating: 4.9,
  reviewCount: 32,
  shiftsCompleted: 48,
  skills: ['Bartending', 'Cocktails', 'Wine Service', 'Customer Service', 'POS Systems'],
  verifications: {
    idVerified: true,
    backgroundCheck: true,
    rightToWork: true,
  },
  recentReviews: [
    { id: '1', company: 'The Brazen Head', rating: 5, comment: 'Excellent work, very professional. Would hire again!', date: '2026-01-28' },
    { id: '2', company: 'Restaurant XYZ', rating: 5, comment: 'Great bartender, handled busy Friday night perfectly.', date: '2026-01-21' },
    { id: '3', company: 'Hotel Dublin', rating: 4, comment: 'Good worker, punctual and reliable.', date: '2026-01-14' },
  ],
}

function UserProfilePage() {
  const { userId } = Route.useParams()
  const user = mockUserProfile // In real app: fetch user by userId

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
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                {user.verifications.idVerified && (
                  <Badge variant="success" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {user.city}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  {user.rating} ({user.reviewCount} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {user.memberSince}
                </span>
              </div>
              <p className="text-muted-foreground">{user.bio}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verifications */}
      <Card>
        <CardHeader>
          <CardTitle>Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${user.verifications.idVerified ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : ''}`}>
              <CheckCircle className={`h-5 w-5 ${user.verifications.idVerified ? 'text-green-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium text-sm">ID Verified</p>
                <p className="text-xs text-muted-foreground">{user.verifications.idVerified ? 'Confirmed' : 'Pending'}</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${user.verifications.backgroundCheck ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : ''}`}>
              <CheckCircle className={`h-5 w-5 ${user.verifications.backgroundCheck ? 'text-green-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium text-sm">Background Check</p>
                <p className="text-xs text-muted-foreground">{user.verifications.backgroundCheck ? 'Passed' : 'Pending'}</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${user.verifications.rightToWork ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : ''}`}>
              <CheckCircle className={`h-5 w-5 ${user.verifications.rightToWork ? 'text-green-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium text-sm">Right to Work</p>
                <p className="text-xs text-muted-foreground">{user.verifications.rightToWork ? 'Verified' : 'Pending'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {user.skills.map((skill) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <p className="text-2xl font-bold">{user.shiftsCompleted}</p>
              <p className="text-sm text-muted-foreground">Shifts Completed</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-bold">{user.rating}</p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-bold">{user.reviewCount}</p>
              <p className="text-sm text-muted-foreground">Reviews</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.recentReviews.map((review) => (
            <div key={review.id} className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{review.company}</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{review.comment}</p>
              <p className="text-xs text-muted-foreground mt-2">{review.date}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
