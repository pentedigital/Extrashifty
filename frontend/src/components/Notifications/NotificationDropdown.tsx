import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Check, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { NotificationItem } from './NotificationItem'
import type { Notification } from '@/hooks/api/useNotificationsApi'

interface NotificationDropdownProps {
  notifications: Notification[]
  isLoading: boolean
  onMarkAsRead: (id: number) => void
  onMarkAllAsRead: () => void
  onClose: () => void
  unreadCount: number
}

export function NotificationDropdown({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  unreadCount,
}: NotificationDropdownProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-card shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <h3 className="font-semibold">Notifications</h3>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={onMarkAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
          <Link to="/notifications/settings" onClick={onClose}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      <Separator />

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Spinner size="md" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p>No notifications</p>
            <p className="mt-1 text-xs">You're all caught up!</p>
          </div>
        ) : (
          notifications.slice(0, 5).map((notification, index) => (
            <React.Fragment key={notification.id}>
              <NotificationItem
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onClose={onClose}
              />
              {index < Math.min(notifications.length, 5) - 1 && <Separator />}
            </React.Fragment>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Link to="/notifications" onClick={onClose}>
              <Button variant="ghost" className="w-full text-sm" size="sm">
                View all notifications
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
