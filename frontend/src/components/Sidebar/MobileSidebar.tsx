import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Menu, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { UserType } from '@/types/user'
import { getNavForUserType } from './navigation'

interface MobileSidebarProps {
  userType: UserType | null
  userName?: string
  userEmail?: string
  userAvatar?: string
  onLogout: () => void
}

export function MobileSidebar({
  userType,
  userName,
  userEmail,
  userAvatar,
  onLogout,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navSections = getNavForUserType(userType)

  const initials = userName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  const handleNavClick = () => {
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-10 w-10"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link to="/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
                  E
                </div>
                <span className="font-semibold text-lg">ExtraShifty</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3">
              {navSections.map((section, sectionIdx) => (
                <div key={sectionIdx} className={cn(sectionIdx > 0 && 'mt-4')}>
                  {section.title && (
                    <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      {section.title}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <li key={item.href}>
                          <Link
                            to={item.href}
                            onClick={handleNavClick}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                              isActive
                                ? 'bg-brand-50 text-brand-700 font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs text-white">
                                {item.badge}
                              </span>
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
              <div className="flex items-center gap-3 rounded-lg p-2">
                <Avatar size="sm">
                  {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  onLogout()
                  setOpen(false)
                }}
                className="mt-2 w-full text-muted-foreground justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
