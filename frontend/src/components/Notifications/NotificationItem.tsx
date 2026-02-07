import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CheckCheck,
  Calendar,
  CreditCard,
  Clock,
  Star,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import { cn, formatTimeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/hooks/api/useNotificationsApi'

/**
 * Notification type to icon mapping
 */
const notificationIcons: Record<string, React.ElementType> = {
  shift_accepted: CheckCheck,
  application_received: Calendar,
  payment_received: CreditCard,
  shift_reminder: Clock,
  review_received: Star,
}

/**
 * Get the navigation path for a notification based on its type and data
 */
function getNotificationPath(notification: Notification): string | null {
  const data = notification.data as Record<string, number | string | undefined> | null

  switch (notification.type) {
    case 'shift_accepted':
      return data?.shift_id ? `/shifts` : null
    case 'application_received':
      return data?.shift_id ? `/company/shifts/${data.shift_id}/applicants` : '/company/shifts'
    case 'payment_received':
      return '/wallet'
    case 'shift_reminder':
      return data?.shift_id ? `/shifts` : '/shifts'
    case 'review_received':
      return '/profile'
    default:
      return null
  }
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead?: (id: number) => void
  onDelete?: (id: number) => void
  showActions?: boolean
  onClose?: () => void
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  showActions = false,
  onClose,
}: NotificationItemProps) {
  const navigate = useNavigate()
  const Icon = notificationIcons[notification.type] || AlertCircle

  const handleClick = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }

    const path = getNotificationPath(notification)
    if (path) {
      onClose?.()
      navigate({ to: path })
    }
  }

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onMarkAsRead && !notification.is_read) {
      onMarkAsRead(notification.id)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(notification.id)
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 hover:bg-accent cursor-pointer transition-colors group',
        !notification.is_read && 'bg-brand-50'
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          notification.is_read ? 'bg-muted' : 'bg-brand-100'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            notification.is_read ? 'text-muted-foreground' : 'text-brand-600'
          )}
        />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-tight',
              notification.is_read ? 'font-normal' : 'font-medium'
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="h-2 w-2 shrink-0 rounded-full bg-brand-600 mt-1" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {showActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.is_read && onMarkAsRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleMarkAsRead}
              title="Mark as read"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { getNotificationPath }
