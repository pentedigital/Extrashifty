import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ToastProvider } from '@/components/ui/toast'
import { NotFound } from '@/components/ui/not-found'
import { RouteErrorBoundary } from '@/components/ui/error-boundary'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <NotFound />,
  errorComponent: RouteErrorBoundary,
})

function RootComponent() {
  return (
    <ToastProvider>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </ToastProvider>
  )
}
