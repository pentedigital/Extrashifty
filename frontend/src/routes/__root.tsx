import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ToastProvider } from '@/components/ui/toast'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ToastProvider>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </ToastProvider>
  )
}
