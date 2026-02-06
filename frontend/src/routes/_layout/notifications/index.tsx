import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Bell, Check, CheckCheck, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { Select } from '@/components/ui/select'
import { NotificationItem } from '@/components/Notifications/NotificationItem'
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@/hooks/api/useNotificationsApi'

export const Route = createFileRoute('/_layout/notifications/')({
  component: NotificationsPage,
})

const NOTIFICATION_TYPES = [
  { value: 'all', label: 'All Notifications' },
  { value: 'shift_accepted', label: 'Shift Accepted' },
  { value: 'application_received', label: 'Applications Received' },
  { value: 'payment_received', label: 'Payments' },
  { value: 'shift_reminder', label: 'Shift Reminders' },
  { value: 'review_received', label: 'Reviews' },
]

const PAGE_SIZE = 20

function NotificationsPage() {
  const { addToast } = useToast()
  const [typeFilter, setTypeFilter] = useState('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    isFetching,
  } = useNotifications({
    limit: PAGE_SIZE,
    unread_only: showUnreadOnly,
  })

  // Mutations
  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllAsReadMutation = useMarkAllNotificationsAsRead()
  const deleteMutation = useDeleteNotification()

  const notifications = notificationsData?.items ?? []

  // Filter notifications by type
  const filteredNotifications = typeFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === typeFilter)

  const unreadCount = notificationsData?.unread_count ?? notifications.filter((n) => !n.is_read).length

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id, {
      onError: () => {
        addToast({
          type: 'error',
          title: 'Failed to mark notification as read',
          description: 'Please try again.',
        })
      },
    })
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => {
        addToast({
          type: 'success',
          title: 'All notifications marked as read',
        })
      },
      onError: () => {
        addToast({
          type: 'error',
          title: 'Failed to mark all as read',
          description: 'Please try again.',
        })
      },
    })
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        addToast({
          type: 'success',
          title: 'Notification deleted',
        })
      },
      onError: () => {
        addToast({
          type: 'error',
          title: 'Failed to delete notification',
          description: 'Please try again.',
        })
      },
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'You\'re all caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={NOTIFICATION_TYPES}
                className="w-full sm:w-48"
              />
              <Button
                variant={showUnreadOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                <Check className="h-4 w-4 mr-1" />
                Unread only
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {typeFilter === 'all' ? 'All Notifications' : NOTIFICATION_TYPES.find(t => t.value === typeFilter)?.label}
          </CardTitle>
          <CardDescription>
            {isFetching && !isLoading ? 'Refreshing...' : `${filteredNotifications.length} notification${filteredNotifications.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description={
                showUnreadOnly
                  ? 'You have no unread notifications.'
                  : typeFilter !== 'all'
                  ? `You have no ${NOTIFICATION_TYPES.find(t => t.value === typeFilter)?.label.toLowerCase()} notifications.`
                  : 'You don\'t have any notifications yet.'
              }
              className="py-12"
            />
          ) : (
            <div>
              {filteredNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                    showActions
                  />
                  {index < filteredNotifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
