/**
 * Main authenticated layout component.
 *
 * Spacing conventions used throughout the app:
 * - Page sections: space-y-6
 * - Card content items: space-y-4
 * - Form fields: space-y-2
 * - Grid gaps: gap-4 (dense), gap-6 (normal)
 */

import { useEffect } from 'react'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppSidebar } from '@/components/Sidebar/AppSidebar'
import { AppHeader } from '@/components/Header/AppHeader'
import { AppFooter } from '@/components/Footer/AppFooter'
import { useSidebarCollapsed, useAppStore } from '@/stores/app'
import { cn } from '@/lib/utils'
import { tokenManager, api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { LayoutErrorBoundary } from '@/components/ui/error-boundary'
import { NotFound } from '@/components/ui/not-found'
import { PageLoader } from '@/components/ui/page-loader'
import type { UserType } from '@/types/user'

/**
 * Route access configuration mapping route prefixes to allowed user types.
 * Routes not listed here are accessible by all authenticated users.
 */
const ROUTE_ACCESS_CONFIG: Record<string, UserType[]> = {
  '/admin': ['admin', 'super_admin'],
  '/company': ['company'],
  '/agency': ['agency'],
  '/shifts': ['staff'],
}

/**
 * Get the default dashboard route for a user type.
 */
function getDefaultDashboard(userType: UserType | null): string {
  switch (userType) {
    case 'admin':
    case 'super_admin':
      return '/admin'
    case 'company':
      return '/company'
    case 'agency':
      return '/agency'
    case 'staff':
      return '/shifts'
    default:
      return '/marketplace'
  }
}

/**
 * Check if a user type has access to a specific route path.
 */
function hasRouteAccess(pathname: string, userType: UserType | null): boolean {
  // Check each protected route prefix
  for (const [routePrefix, allowedTypes] of Object.entries(ROUTE_ACCESS_CONFIG)) {
    if (pathname.startsWith(routePrefix)) {
      return userType !== null && allowedTypes.includes(userType)
    }
  }
  // Routes not in config are accessible by all authenticated users
  return true
}

export const Route = createFileRoute('/_layout')({
  beforeLoad: async ({ location }) => {
    // Check if user is authenticated
    if (!tokenManager.hasTokens()) {
      throw redirect({ to: '/login' })
    }

    // Get user from store or fetch from API
    let user = useAppStore.getState().user

    if (!user) {
      try {
        user = await api.auth.me()
        useAppStore.getState().setUser(user)
      } catch {
        // Token is invalid, clear and redirect to login
        tokenManager.clearTokens()
        throw redirect({ to: '/login' })
      }
    }

    const userType = user?.user_type ?? null

    // Check role-based access for the current route
    if (!hasRouteAccess(location.pathname, userType)) {
      // Signal unauthorized access for toast feedback
      useAppStore.getState().setUnauthorizedRedirect(true)
      // Redirect to user's default dashboard
      throw redirect({ to: getDefaultDashboard(userType) })
    }
  },
  component: LayoutComponent,
  errorComponent: LayoutErrorBoundary,
  notFoundComponent: () => <NotFound minimal />,
  pendingComponent: PageLoader,
})

function LayoutComponent() {
  const { user, logout, userType } = useAuth()
  const collapsed = useSidebarCollapsed()
  const unauthorizedRedirect = useAppStore((s) => s.unauthorizedRedirect)
  const { addToast } = useToast()

  useEffect(() => {
    if (unauthorizedRedirect) {
      addToast({
        type: 'warning',
        title: 'Access denied',
        description: "You don't have permission to view that page.",
      })
      useAppStore.getState().setUnauthorizedRedirect(false)
    }
  }, [unauthorizedRedirect, addToast])

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar
          userType={userType}
          userName={user?.full_name}
          userEmail={user?.email}
          userAvatar={user?.avatar_url}
          onLogout={logout}
        />
      </div>
      <div
        className={cn(
          'min-h-screen transition-all duration-300 flex flex-col',
          // Only apply margin on desktop
          collapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        <AppHeader onLogout={logout} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
