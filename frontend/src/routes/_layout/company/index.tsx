import { createFileRoute } from '@tanstack/react-router'
import { CompanyDashboard } from '@/components/Company/CompanyDashboard'

export const Route = createFileRoute('/_layout/company/')({
  component: CompanyDashboard,
})
