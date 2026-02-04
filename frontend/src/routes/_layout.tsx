import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppSidebar } from '@/components/Sidebar/AppSidebar'
import { AppHeader } from '@/components/Header/AppHeader'
import { useSidebarCollapsed } from '@/stores/app'
import { cn } from '@/lib/utils'
import { tokenManager } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/_layout')({
  beforeLoad: () => {
    // Check if user is authenticated
    if (!tokenManager.hasTokens()) {
      throw redirect({ to: '/login' })
    }
  },
  component: LayoutComponent,
})

function LayoutComponent() {
  const { user, logout, userType } = useAuth()
  const collapsed = useSidebarCollapsed()

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
      </div>
    </div>
  )
}
