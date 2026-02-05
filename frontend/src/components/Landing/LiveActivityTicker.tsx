import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, CheckCircle, Zap, MapPin, Clock } from 'lucide-react'

interface Activity {
  id: string
  type: 'posted' | 'claimed' | 'filled'
  title: string
  company?: string
  worker?: string
  location: string
  rate?: number
  timeAgo: string
}

const mockActivities: Activity[] = [
  { id: '1', type: 'posted', title: 'Bartender', company: 'The Brazen Head', location: 'Dublin 8', rate: 18, timeAgo: '2s' },
  { id: '2', type: 'claimed', title: 'Server', worker: 'Marcus T.', location: 'Dublin 2', rate: 16, timeAgo: '5s' },
  { id: '3', type: 'filled', title: 'Weekend Brunch', company: 'Café Central', location: 'Dublin 4', timeAgo: '12s' },
  { id: '4', type: 'posted', title: 'Line Cook', company: 'Hotel Dublin', location: 'Dublin 1', rate: 20, timeAgo: '18s' },
  { id: '5', type: 'claimed', title: 'Barista', worker: 'Sarah K.', location: 'Dublin 6', rate: 15, timeAgo: '25s' },
  { id: '6', type: 'filled', title: 'Friday Night Staff', company: 'The Local', location: 'Dublin 7', timeAgo: '32s' },
  { id: '7', type: 'posted', title: 'Host/Hostess', company: 'Restaurant XYZ', location: 'Dublin 2', rate: 14, timeAgo: '38s' },
  { id: '8', type: 'claimed', title: 'Kitchen Porter', worker: 'James M.', location: 'Dublin 8', rate: 13, timeAgo: '45s' },
]

function ActivityItem({ activity }: { activity: Activity }) {
  const icons = {
    posted: <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />,
    claimed: <Zap className="h-3.5 w-3.5" aria-hidden="true" />,
    filled: <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />,
  }

  const colors = {
    posted: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    claimed: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    filled: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-800',
  }

  const labels = {
    posted: 'POSTED',
    claimed: 'CLAIMED',
    filled: 'FILLED',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg border shrink-0 bg-background/80 backdrop-blur-sm',
        colors[activity.type]
      )}
    >
      <span className={cn('p-1 rounded', colors[activity.type])}>
        {icons[activity.type]}
      </span>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">{activity.title}</span>
        <span className="text-muted-foreground">
          {activity.type === 'posted' && `@ ${activity.company}`}
          {activity.type === 'claimed' && `by ${activity.worker}`}
          {activity.type === 'filled' && `@ ${activity.company}`}
        </span>
        {activity.rate && (
          <span className="font-semibold text-brand-600 dark:text-brand-400">
            €{activity.rate}/hr
          </span>
        )}
      </div>
      <span className={cn('text-xs font-bold px-2 py-0.5 rounded', colors[activity.type])}>
        {labels[activity.type]}
      </span>
    </div>
  )
}

export function LiveActivityTicker() {
  const [activities] = useState(mockActivities)
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative overflow-hidden overflow-x-hidden" role="region" aria-label="Live marketplace activity">
      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600" />
        </span>
        <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
          Live Activity
        </span>
      </div>

      {/* Scrolling ticker */}
      <div className="relative overflow-x-hidden min-w-0">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Ticker content */}
        <div
          ref={scrollRef}
          className="flex gap-3 animate-ticker"
          style={{ width: 'max-content' }}
        >
          {/* Double the items for seamless loop */}
          {[...activities, ...activities].map((activity, idx) => (
            <ActivityItem key={`${activity.id}-${idx}`} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Live Stats Counter Component
interface LiveStatProps {
  label: string
  value: number
  suffix?: string
  trend?: number
  icon: React.ElementType
  color: 'brand' | 'green' | 'blue'
}

export function LiveStatCounter({ label, value, suffix = '', trend, icon: Icon, color }: LiveStatProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  const colorClasses = {
    brand: 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400',
    green: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  }

  const valueClasses = {
    brand: 'text-brand-600 dark:text-brand-400',
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
  }

  return (
    <div className="text-center">
      <div className={cn('inline-flex items-center justify-center h-14 w-14 rounded-full mb-3', colorClasses[color])}>
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-3xl md:text-4xl font-bold tracking-tight', valueClasses[color])}>
        {displayValue.toLocaleString()}{suffix}
      </p>
      {trend !== undefined && (
        <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1 flex items-center justify-center gap-1">
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
          +{trend} this hour
        </p>
      )}
    </div>
  )
}

// Live Shift Card Component
interface LiveShiftProps {
  title: string
  company: string
  location: string
  rate: number
  startTime: string
  endTime: string
  spotsFilled: number
  spotsTotal: number
  postedAgo: string
}

export function LiveShiftCard({
  title,
  company,
  location,
  rate,
  startTime,
  endTime,
  spotsFilled,
  spotsTotal,
  postedAgo,
}: LiveShiftProps) {
  const fillPercentage = (spotsFilled / spotsTotal) * 100

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-brand-500/50 bg-gradient-to-br from-brand-50/50 to-background dark:from-brand-950/30 dark:to-background">
      {/* Pulse border */}
      <div className="absolute inset-0 rounded-xl border-2 border-brand-500 animate-pulse opacity-30" />

      <div className="p-4 relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {title}
              <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-green-600 px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{company}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-brand-600 dark:text-brand-400">€{rate}</p>
            <p className="text-xs text-muted-foreground">/hour</p>
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {startTime} - {endTime}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {location}
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {spotsFilled}/{spotsTotal} filled
            </span>
            <span className="text-xs font-bold text-green-600 dark:text-green-400">
              {Math.round(fillPercentage)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-green-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-right">
          Posted {postedAgo}
        </p>
      </div>
    </div>
  )
}
