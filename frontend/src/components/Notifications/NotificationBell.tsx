'use client'

import * as React from 'react'
import { Bell, Check, CheckCheck, Mail, CreditCard, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { mockApi } from '@/lib/mockApi'
import type { Notification, NotificationType } from '@/types/features'

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  return date.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })
}

const notificationIcons: Record<NotificationType, React.ElementType> = {
  shift_update: Calendar,
  application_update: CheckCheck,
  message: Mail,
  payment: CreditCard,
  system: AlertCircle,
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] || AlertCircle

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 hover:bg-accent cursor-pointer transition-colors',
        !notification.read && 'bg-brand-50'
      )}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          notification.read ? 'bg-muted' : 'bg-brand-100'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            notification.read ? 'text-muted-foreground' : 'text-brand-600'
          )}
        />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-tight',
              notification.read ? 'font-normal' : 'font-medium'
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <div className="h-2 w-2 shrink-0 rounded-full bg-brand-600 mt-1" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>
    </div>
  )
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await mockApi.notifications.list()
      setNotifications(data)
    } catch {
      // Error handled silently
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = async (id: string) => {
    try {
      await mockApi.notifications.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      )
    } catch {
      // Error handled silently
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await mockApi.notifications.markAllAsRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      )
    } catch {
      // Error handled silently
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px]"
            variant="default"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-card shadow-lg z-50">
          <div className="flex items-center justify-between p-3">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <Separator />

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                  {index < notifications.length - 1 && <Separator />}
                </React.Fragment>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-2">
                <Button variant="ghost" className="w-full text-sm" size="sm">
                  View all notifications
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
