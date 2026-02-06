import {
  Home,
  Search,
  Calendar,
  FileText,
  Building2,
  Users,
  Briefcase,
  Settings,
  User,
  ClipboardList,
  CreditCard,
  BarChart3,
  UserPlus,
  Building,
  CalendarDays,
  Shield,
  Activity,
  Wallet,
  Clock,
} from 'lucide-react'
import type { UserType } from '@/types/user'

export interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export const staffNav: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Find Shifts', href: '/marketplace', icon: Search },
    ],
  },
  {
    title: 'My Work',
    items: [
      { label: 'My Shifts', href: '/shifts', icon: Calendar },
      { label: 'Applications', href: '/shifts/applications', icon: FileText },
      { label: 'Time Tracking', href: '/shifts/time', icon: Clock },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/profile', icon: User },
      { label: 'Wallet', href: '/wallet', icon: Wallet },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export const companyNav: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Browse Marketplace', href: '/marketplace', icon: Search },
    ],
  },
  {
    title: 'Shifts',
    items: [
      { label: 'My Shifts', href: '/company/shifts', icon: Calendar },
      { label: 'Create Shift', href: '/company/shifts/create', icon: ClipboardList },
    ],
  },
  {
    title: 'Network',
    items: [
      { label: 'Preferred Agencies', href: '/company/agencies', icon: Building2 },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Company Profile', href: '/profile', icon: Building },
      { label: 'Wallet', href: '/company/wallet', icon: Wallet },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export const agencyNav: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Browse Marketplace', href: '/marketplace', icon: Search },
    ],
  },
  {
    title: 'Staff',
    items: [
      { label: 'Staff Pool', href: '/agency/staff', icon: Users },
      { label: 'Invite Staff', href: '/agency/staff/invite', icon: UserPlus },
    ],
  },
  {
    title: 'Clients',
    items: [
      { label: 'Client List', href: '/agency/clients', icon: Building2 },
      { label: 'Add Client', href: '/agency/clients/add', icon: Briefcase },
    ],
  },
  {
    title: 'Shifts',
    items: [
      { label: 'All Shifts', href: '/agency/shifts', icon: Calendar },
      { label: 'Create Shift', href: '/agency/shifts/create', icon: ClipboardList },
      { label: 'Schedule', href: '/agency/schedule', icon: CalendarDays },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'Overview', href: '/agency/billing', icon: BarChart3 },
      { label: 'Invoices', href: '/agency/billing/invoices', icon: FileText },
      { label: 'Payroll', href: '/agency/billing/payroll', icon: CreditCard },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Agency Profile', href: '/profile', icon: Building },
      { label: 'Wallet', href: '/wallet', icon: Wallet },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export const adminNav: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Marketplace', href: '/marketplace', icon: Search },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Companies', href: '/admin/companies', icon: Building2 },
      { label: 'Agencies', href: '/admin/agencies', icon: Briefcase },
      { label: 'Shifts', href: '/admin/shifts', icon: Calendar },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Transactions', href: '/admin/transactions', icon: CreditCard },
      { label: 'Payouts', href: '/admin/payouts', icon: Wallet },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Audit Logs', href: '/admin/audit', icon: Activity },
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export const superAdminNav: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Marketplace', href: '/marketplace', icon: Search },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Companies', href: '/admin/companies', icon: Building2 },
      { label: 'Agencies', href: '/admin/agencies', icon: Briefcase },
      { label: 'Shifts', href: '/admin/shifts', icon: Calendar },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Transactions', href: '/admin/transactions', icon: CreditCard },
      { label: 'Payouts', href: '/admin/payouts', icon: Wallet },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Audit Logs', href: '/admin/audit', icon: Activity },
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
      { label: 'Admin Users', href: '/admin/admins', icon: Shield },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export function getNavForUserType(userType: UserType | null): NavSection[] {
  switch (userType) {
    case 'staff':
      return staffNav
    case 'company':
      return companyNav
    case 'agency':
      return agencyNav
    case 'admin':
      return adminNav
    case 'super_admin':
      return superAdminNav
    default:
      return staffNav
  }
}
