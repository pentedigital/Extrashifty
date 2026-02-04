import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/spinner'

// Import dashboard components
import { StaffDashboard } from '@/components/Staff/StaffDashboard'
import { CompanyDashboard } from '@/components/Company/CompanyDashboard'
import { AgencyDashboard } from '@/components/Agency/AgencyDashboard'

export const Route = createFileRoute('/_layout/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { userType, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  switch (userType) {
    case 'staff':
      return <StaffDashboard />
    case 'company':
      return <CompanyDashboard />
    case 'agency':
      return <AgencyDashboard />
    case 'admin':
    case 'super_admin':
      // TODO: Admin dashboard
      return <StaffDashboard />
    default:
      return <StaffDashboard />
  }
}
