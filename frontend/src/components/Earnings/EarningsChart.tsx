import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

interface EarningsDataPoint {
  label: string
  amount: number
}

interface EarningsChartProps {
  data: EarningsDataPoint[]
  title?: string
  isLoading?: boolean
  currency?: string
}

export function EarningsChart({
  data,
  title = 'Earnings Over Time',
  isLoading = false,
  currency = 'EUR',
}: EarningsChartProps) {
  const maxAmount = useMemo(() => {
    return Math.max(...data.map(d => d.amount), 1)
  }, [data])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No earnings data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 h-[200px]">
          {data.map((point, index) => {
            const heightPercent = (point.amount / maxAmount) * 100
            const minHeight = point.amount > 0 ? 8 : 0

            return (
              <div
                key={index}
                className="flex flex-col items-center flex-1 gap-2"
              >
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-brand-600 rounded-t transition-all hover:bg-brand-700 cursor-pointer group relative"
                    style={{ height: `${Math.max(heightPercent, minHeight)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatCurrency(point.amount, currency)}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-full">
                  {point.label}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Generate chart data from earnings
export function generateChartData(
  earnings: Array<{ date: string; amount: number }>,
  groupBy: 'day' | 'week' | 'month' = 'day',
  limit: number = 7
): EarningsDataPoint[] {
  const grouped = new Map<string, number>()

  earnings.forEach(e => {
    const date = new Date(e.date)
    let key: string

    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })
        break
      case 'month':
        key = date.toLocaleDateString('en-IE', { month: 'short', year: '2-digit' })
        break
      case 'day':
      default:
        key = date.toLocaleDateString('en-IE', { weekday: 'short' })
    }

    grouped.set(key, (grouped.get(key) || 0) + e.amount)
  })

  // Convert to array and take last N entries
  const entries = Array.from(grouped.entries())
    .slice(-limit)
    .map(([label, amount]) => ({ label, amount }))

  // Fill in missing days if grouping by day
  if (groupBy === 'day' && entries.length < limit) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date().getDay()
    const result: EarningsDataPoint[] = []

    for (let i = limit - 1; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7
      const dayLabel = days[dayIndex]
      const existing = entries.find(e => e.label === dayLabel)
      result.push(existing || { label: dayLabel, amount: 0 })
    }

    return result
  }

  return entries
}
