import { createFileRoute } from '@tanstack/react-router'
import { AgencyDashboard } from '@/components/Agency/AgencyDashboard'

export const Route = createFileRoute('/_layout/agency/')({
  component: AgencyDashboard,
})
