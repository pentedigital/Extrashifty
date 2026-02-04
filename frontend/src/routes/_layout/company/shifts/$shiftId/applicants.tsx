import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Check, X, Star, Calendar, MessageSquare } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export const Route = createFileRoute('/_layout/company/shifts/$shiftId/applicants')({
  component: ShiftApplicantsPage,
})

const mockApplicants = [
  { id: '1', name: 'John Doe', rating: 4.9, shiftsCompleted: 48, skills: ['Bartending', 'Cocktails'], appliedAt: '2026-02-04', status: 'pending', coverMessage: 'I have 5 years of experience in busy Dublin bars and I am available for this shift.' },
  { id: '2', name: 'Maria Santos', rating: 4.7, shiftsCompleted: 32, skills: ['Bartending', 'Wine Service'], appliedAt: '2026-02-04', status: 'pending', coverMessage: 'Experienced bartender with cocktail specialization. Looking forward to working with you!' },
  { id: '3', name: 'Tom Wilson', rating: 4.5, shiftsCompleted: 18, skills: ['Bartending'], appliedAt: '2026-02-03', status: 'pending', coverMessage: 'Available and ready to work. Have worked similar venues before.' },
]

function ShiftApplicantsPage() {
  const { shiftId } = Route.useParams()
  const { addToast } = useToast()
  const [applicants, setApplicants] = useState(mockApplicants)

  const handleAccept = (applicantId: string) => {
    setApplicants(prev => prev.map(a =>
      a.id === applicantId ? { ...a, status: 'accepted' } : a
    ))
    addToast({
      type: 'success',
      title: 'Applicant accepted',
      description: 'The worker has been notified and assigned to this shift.',
    })
  }

  const handleReject = (applicantId: string) => {
    setApplicants(prev => prev.map(a =>
      a.id === applicantId ? { ...a, status: 'rejected' } : a
    ))
    addToast({
      type: 'info',
      title: 'Applicant rejected',
      description: 'The worker has been notified.',
    })
  }

  const pendingApplicants = applicants.filter(a => a.status === 'pending')
  const acceptedApplicants = applicants.filter(a => a.status === 'accepted')
  const rejectedApplicants = applicants.filter(a => a.status === 'rejected')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/company/shifts/${shiftId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Shift Applicants</h1>
          <p className="text-muted-foreground">
            {applicants.length} total applicants • {pendingApplicants.length} pending review
          </p>
        </div>
      </div>

      {/* Pending Applicants */}
      {pendingApplicants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Review
              <Badge variant="warning">{pendingApplicants.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApplicants.map((applicant) => (
              <div key={applicant.id} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <Avatar size="lg">
                      <AvatarFallback>{applicant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{applicant.name}</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span>{applicant.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{applicant.shiftsCompleted} shifts completed</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {applicant.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                      {applicant.coverMessage && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <MessageSquare className="h-3 w-3" />
                            Cover Message
                          </div>
                          <p className="text-sm">{applicant.coverMessage}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => handleReject(applicant.id)}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(applicant.id)}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Accepted Applicants */}
      {acceptedApplicants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Accepted
              <Badge variant="success">{acceptedApplicants.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {acceptedApplicants.map((applicant) => (
              <div key={applicant.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{applicant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{applicant.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>{applicant.rating}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="success">Assigned</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rejected Applicants */}
      {rejectedApplicants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              Rejected
              <Badge variant="outline">{rejectedApplicants.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rejectedApplicants.map((applicant) => (
              <div key={applicant.id} className="flex items-center justify-between p-3 rounded-lg border opacity-60">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{applicant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{applicant.name}</p>
                </div>
                <Badge variant="outline">Rejected</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {applicants.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No applicants yet for this shift.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
