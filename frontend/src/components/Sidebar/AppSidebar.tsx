import { Link, useLocation } from '@tanstack/react-router'
import {
  Home,
  Search,
  Calendar,
  FileText,
  Building2,
  Users,
  Briefcase,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
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
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAppStore, useSidebarCollapsed } from '@/stores/app'
import type { UserType } from '@/types/user'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const staffNav: NavSection[] = [
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

const companyNav: NavSection[] = [
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
      { label: 'Wallet', href: '/wallet', icon: Wallet },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

const agencyNav: NavSection[] = [
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

const adminNav: NavSection[] = [
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

const superAdminNav: NavSection[] = [
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

function getNavForUserType(userType: UserType | null): NavSection[] {
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

interface AppSidebarProps {
  userType: UserType | null
  userName?: string
  userEmail?: string
  userAvatar?: string
  onLogout: () => void
}

export function AppSidebar({
  userType,
  userName,
  userEmail,
  userAvatar,
  onLogout,
}: AppSidebarProps) {
  const location = useLocation()
  const collapsed = useSidebarCollapsed()
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)

  const navSections = getNavForUserType(userType)
  const initials = userName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
                E
              </div>
              <span className="font-semibold text-lg">ExtraShifty</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard" className="mx-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
                E
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(collapsed && 'mx-auto')}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {navSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className={cn(sectionIdx > 0 && 'mt-4')}>
              {section.title && !collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  {section.title}
                </p>
              )}
              {section.title && collapsed && sectionIdx > 0 && (
                <Separator className="my-2" />
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-brand-50 text-brand-700 font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          collapsed && 'justify-center px-2'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs text-white">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2',
              collapsed && 'justify-center'
            )}
          >
            <Avatar size="sm">
              {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            onClick={onLogout}
            className={cn('mt-2 w-full text-muted-foreground', collapsed && 'mx-auto')}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Log out</span>}
          </Button>
        </div>
      </div>
    </aside>
  )
}
