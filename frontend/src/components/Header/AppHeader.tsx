import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/Notifications/NotificationBell'
import { MobileSidebar } from '@/components/Sidebar/MobileSidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, HelpCircle } from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface AppHeaderProps {
  title?: string
  onLogout: () => void
}

export function AppHeader({ title, onLogout }: AppHeaderProps) {
  const { user, userType } = useAuth()

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile Menu */}
      <MobileSidebar
        userType={userType}
        userName={user?.full_name}
        userEmail={user?.email}
        userAvatar={user?.avatar_url}
        onLogout={onLogout}
      />

      {title && (
        <h1 className="text-lg font-semibold hidden sm:block">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex relative w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="pl-8 h-9"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="hidden sm:flex">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>

        <NotificationBell />

        <Link to="/profile" className="ml-2">
          <Avatar size="sm">
            {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
