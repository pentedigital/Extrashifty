import { useState, useMemo, useEffect, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ShiftFilters, FilterSidebar } from '@/components/Shifts/ShiftFilters'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  AlertCircle,
  MapPin,
  Clock,
  Euro,
  Building2,
  CheckCircle,
  TrendingUp,
  Zap,
  Activity,
  Users,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { useShifts } from '@/hooks/api'
import { useWebSocketOptional } from '@/contexts/WebSocketContext'
import type { ShiftFilters as ShiftFiltersType, Shift } from '@/types/shift'

export const Route = createFileRoute('/_layout/marketplace/')({
  component: MarketplacePage,
})

type SortField = 'date' | 'hourly_rate' | 'city' | 'shift_type' | 'spots'
type SortDirection = 'asc' | 'desc'

const shiftTypeLabels: Record<string, string> = {
  bar: 'BAR',
  server: 'SRV',
  kitchen: 'KIT',
  chef: 'CHF',
  host: 'HST',
  general: 'GEN',
}

function MarketplacePage() {
  const [filters, setFilters] = useState<ShiftFiltersType>({})
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const tickerRef = useRef<HTMLDivElement>(null)

  // WebSocket for real-time connection indicator
  const ws = useWebSocketOptional()

  // Fetch shifts from API with filters
  const { data, isLoading, error, dataUpdatedAt } = useShifts({
    ...filters,
    status: 'open',
  })

  const shifts = data?.items ?? []
  const totalResults = data?.total ?? 0

  // Compute market stats from current data
  const marketStats = useMemo(() => {
    if (shifts.length === 0) {
      return {
        totalOpen: 0,
        avgRate: 0,
        totalSpots: 0,
        topCity: '-',
        highestRate: 0,
        lowestRate: 0,
        shiftTypes: 0,
      }
    }

    const rates = shifts.map((s: Shift) => s.hourly_rate)
    const cities = shifts.reduce<Record<string, number>>((acc, s: Shift) => {
      acc[s.city] = (acc[s.city] || 0) + 1
      return acc
    }, {})
    const topCity = Object.entries(cities).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'
    const uniqueTypes = new Set(shifts.map((s: Shift) => s.shift_type))

    return {
      totalOpen: totalResults,
      avgRate: rates.reduce((a, b) => a + b, 0) / rates.length,
      totalSpots: shifts.reduce((a: number, s: Shift) => a + (s.spots_total - s.spots_filled), 0),
      topCity,
      highestRate: Math.max(...rates),
      lowestRate: Math.min(...rates),
      shiftTypes: uniqueTypes.size,
    }
  }, [shifts, totalResults])

  // Sort shifts locally
  const sortedShifts = useMemo(() => {
    const sorted = [...shifts]
    sorted.sort((a: Shift, b: Shift) => {
      let cmp = 0
      switch (sortField) {
        case 'date':
          cmp = a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
          break
        case 'hourly_rate':
          cmp = a.hourly_rate - b.hourly_rate
          break
        case 'city':
          cmp = a.city.localeCompare(b.city)
          break
        case 'shift_type':
          cmp = a.shift_type.localeCompare(b.shift_type)
          break
        case 'spots':
          cmp = (a.spots_total - a.spots_filled) - (b.spots_total - b.spots_filled)
          break
      }
      return sortDirection === 'desc' ? -cmp : cmp
    })
    return sorted
  }, [shifts, sortField, sortDirection])

  // Ticker data — derived from top shifts
  const tickerItems = useMemo(() => {
    return shifts.slice(0, 12).map((s: Shift) => ({
      id: s.id,
      title: s.title,
      rate: s.hourly_rate,
      city: s.city,
      type: shiftTypeLabels[s.shift_type] || s.shift_type.toUpperCase(),
    }))
  }, [shifts])

  // Live clock
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    )
  }

  return (
    <div className="space-y-4">
      {/* Terminal Header Bar */}
      <div className="rounded-xl bg-terminal-bg border border-terminal-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-terminal-accent" />
              <h1 className="text-lg font-bold text-terminal-fg tracking-tight">
                SHIFT MARKET
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  ws?.isConnected ? 'bg-terminal-positive animate-pulse-dot' : 'bg-terminal-muted'
                )}
              />
              <span className="text-xs text-terminal-muted terminal-text">
                {ws?.isConnected ? 'LIVE' : 'POLL'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs terminal-text">
            <span className="text-terminal-muted">
              {now.toLocaleTimeString('en-IE', { hour12: false })}
            </span>
            <span className="text-terminal-fg">
              {totalResults} <span className="text-terminal-muted">OPEN</span>
            </span>
            <span className="text-terminal-positive">
              {formatCurrency(marketStats.avgRate)}
              <span className="text-terminal-muted">/HR AVG</span>
            </span>
            <span className="text-terminal-fg">
              {marketStats.totalSpots} <span className="text-terminal-muted">SPOTS</span>
            </span>
            {dataUpdatedAt > 0 && (
              <span className="text-terminal-muted hidden md:inline">
                UPD {new Date(dataUpdatedAt).toLocaleTimeString('en-IE', { hour12: false })}
              </span>
            )}
          </div>
        </div>

        {/* Scrolling Ticker */}
        {tickerItems.length > 0 && (
          <div className="mt-3 overflow-hidden border-t border-terminal-border pt-2">
            <div ref={tickerRef} className="flex gap-6 animate-ticker whitespace-nowrap">
              {/* Duplicate for seamless loop */}
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 text-xs terminal-text">
                  <span className="text-terminal-accent font-medium">{item.type}</span>
                  <span className="text-terminal-fg">{item.title}</span>
                  <span className="text-terminal-positive">{formatCurrency(item.rate)}/hr</span>
                  <span className="text-terminal-muted">{item.city}</span>
                  <span className="text-terminal-border">|</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Market Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'OPEN', value: marketStats.totalOpen, color: 'text-terminal-accent' },
          { label: 'AVG RATE', value: formatCurrency(marketStats.avgRate), color: 'text-terminal-positive' },
          { label: 'HIGH', value: formatCurrency(marketStats.highestRate), color: 'text-terminal-positive' },
          { label: 'LOW', value: formatCurrency(marketStats.lowestRate), color: 'text-terminal-negative' },
          { label: 'SPOTS', value: marketStats.totalSpots, color: 'text-terminal-fg' },
          { label: 'TOP CITY', value: marketStats.topCity, color: 'text-terminal-accent' },
          { label: 'TYPES', value: marketStats.shiftTypes, color: 'text-terminal-fg' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-card p-2.5 text-center"
          >
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={cn('text-sm font-semibold tabular-nums mt-0.5', stat.color)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <FilterSidebar filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-3">
          {/* Filter Bar + View Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ShiftFilters
                filters={filters}
                onFiltersChange={setFilters}
                totalResults={totalResults}
              />
            </div>
            <div className="hidden sm:flex items-center border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'px-3 py-2 text-xs font-medium transition-colors',
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'px-3 py-2 text-xs font-medium transition-colors',
                  viewMode === 'cards'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                Cards
              </button>
            </div>
          </div>

          {error ? (
            <EmptyState
              icon={AlertCircle}
              title="Failed to load shifts"
              description="There was an error loading shifts. Please try again later."
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-terminal-accent" />
              <span className="text-sm text-muted-foreground terminal-text">Loading market data...</span>
            </div>
          ) : sortedShifts.length > 0 ? (
            viewMode === 'table' ? (
              /* Data Table View */
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <button type="button" className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('shift_type')}>
                            TYPE <SortIcon field="shift_type" />
                          </button>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">SHIFT</th>
                        <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">
                          <button type="button" className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('city')}>
                            LOCATION <SortIcon field="city" />
                          </button>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <button type="button" className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('date')}>
                            WHEN <SortIcon field="date" />
                          </button>
                        </th>
                        <th className="text-right p-3 font-medium text-muted-foreground">
                          <button type="button" className="flex items-center gap-1 justify-end hover:text-foreground transition-colors" onClick={() => handleSort('hourly_rate')}>
                            RATE <SortIcon field="hourly_rate" />
                          </button>
                        </th>
                        <th className="text-center p-3 font-medium text-muted-foreground hidden sm:table-cell">
                          <button type="button" className="flex items-center gap-1 justify-center hover:text-foreground transition-colors" onClick={() => handleSort('spots')}>
                            AVAIL <SortIcon field="spots" />
                          </button>
                        </th>
                        <th className="text-right p-3 font-medium text-muted-foreground">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedShifts.map((shift: Shift, idx: number) => {
                        const spotsAvail = shift.spots_total - shift.spots_filled
                        const totalPay = shift.total_pay || shift.hourly_rate * (shift.duration_hours || 6)
                        return (
                          <tr
                            key={shift.id}
                            className={cn(
                              'border-b last:border-0 hover:bg-muted/30 transition-colors',
                              idx % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                            )}
                          >
                            <td className="p-3">
                              <Badge variant="outline" className="font-mono text-xs">
                                {shiftTypeLabels[shift.shift_type] || shift.shift_type.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="min-w-0">
                                <p className="font-medium truncate max-w-[200px]">{shift.title}</p>
                                {shift.company && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                    <Building2 className="h-3 w-3" />
                                    <span className="truncate">{shift.company.company_name}</span>
                                    {shift.company.is_verified && (
                                      <CheckCircle className="h-3 w-3 text-brand-600 shrink-0" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[120px]">
                                  {shift.city}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                <p className="tabular-nums">{formatDate(shift.date)}</p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                </p>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <p className="font-semibold text-brand-600 tabular-nums">
                                {formatCurrency(shift.hourly_rate)}/hr
                              </p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {formatCurrency(totalPay)} total
                              </p>
                            </td>
                            <td className="p-3 text-center hidden sm:table-cell">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
                                  spotsAvail <= 1 ? 'text-destructive' : spotsAvail <= 3 ? 'text-warning' : 'text-success'
                                )}
                              >
                                <Users className="h-3 w-3" />
                                {spotsAvail}/{shift.spots_total}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <Link to={`/marketplace/${shift.id}`}>
                                <Button size="sm" variant="outline" className="text-xs">
                                  View
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground terminal-text">
                    {sortedShifts.length} of {totalResults} shifts displayed
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground terminal-text">
                    <Activity className="h-3 w-3" />
                    <span>Sorted by {sortField.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Card Grid View (preserved for mobile) */
              <div className="dashboard-cards-grid">
                {sortedShifts.map((shift: Shift) => {
                  const spotsAvail = shift.spots_total - shift.spots_filled
                  const totalPay = shift.total_pay || shift.hourly_rate * (shift.duration_hours || 6)
                  return (
                    <div
                      key={shift.id}
                      className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{shift.title}</h3>
                            <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                              {shiftTypeLabels[shift.shift_type] || shift.shift_type.toUpperCase()}
                            </Badge>
                          </div>
                          {shift.company && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span>{shift.company.company_name}</span>
                              {shift.company.is_verified && (
                                <CheckCircle className="h-3 w-3 text-brand-600" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-brand-600 tabular-nums">
                            {formatCurrency(shift.hourly_rate)}/hr
                          </p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {formatCurrency(totalPay)} total
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {shift.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatDate(shift.date)}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-medium tabular-nums',
                              spotsAvail <= 1 ? 'text-destructive' : spotsAvail <= 3 ? 'text-warning' : 'text-success'
                            )}
                          >
                            {spotsAvail} spot{spotsAvail !== 1 ? 's' : ''} left
                          </span>
                        </div>
                        <Link to={`/marketplace/${shift.id}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <EmptyState
              icon={Search}
              title="No shifts found"
              description="Try adjusting your filters or check back later for new opportunities."
            />
          )}
        </div>
      </div>
    </div>
  )
}
