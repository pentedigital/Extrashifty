import { Link } from '@tanstack/react-router'
import { MapPin, Clock, Euro, Building2, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EscrowStatusBadge } from '@/components/ui/escrow-status-badge'
import type { EscrowStatus } from '@/components/ui/escrow-status-badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getShiftStatusBadge } from '@/lib/badgeUtils'
import type { Shift } from '@/types/shift'

interface ShiftCardProps {
  shift: Shift
  showApplyButton?: boolean
}

const shiftTypeLabels: Record<string, string> = {
  bar: 'Bar',
  server: 'Server',
  kitchen: 'Kitchen',
  chef: 'Chef',
  host: 'Host',
  general: 'General',
}

function getEscrowStatus(shift: Shift): EscrowStatus | null {
  if (shift.status === 'filled' || shift.status === 'in_progress') return 'locked'
  if (shift.status === 'completed') return 'released'
  return null
}

export function ShiftCard({ shift, showApplyButton = true }: ShiftCardProps) {
  const durationHours = shift.duration_hours || 6
  const totalPay = shift.total_pay || shift.hourly_rate * durationHours
  const escrowStatus = getEscrowStatus(shift)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{shift.title}</h3>
                {(() => {
                  const badgeConfig = getShiftStatusBadge(shift.status, shift.spots_total, shift.spots_filled)
                  return <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
                })()}
                {escrowStatus && <EscrowStatusBadge status={escrowStatus} />}
              </div>
              {shift.company && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{shift.company.company_name}</span>
                  {shift.company.is_verified && (
                    <CheckCircle className="h-3.5 w-3.5 text-brand-600" />
                  )}
                </div>
              )}
            </div>
            <Badge variant="outline">{shiftTypeLabels[shift.shift_type] || shift.shift_type}</Badge>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{shift.location_name}, {shift.city}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {formatDate(shift.date)} • {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
              </span>
            </div>
          </div>

          {/* Pay & Action */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1">
              <Euro className="h-4 w-4 text-brand-600" />
              <span className="font-semibold text-brand-600">
                {formatCurrency(shift.hourly_rate)}/hr
              </span>
              <span className="text-sm text-muted-foreground">
                ({formatCurrency(totalPay)} total)
              </span>
            </div>
            {showApplyButton && shift.status === 'open' && (
              <Link to={`/marketplace/${shift.id}`}>
                <Button size="sm">View Details</Button>
              </Link>
            )}
          </div>

          {/* Spots */}
          {shift.spots_total > 1 && (
            <div className="text-xs text-muted-foreground">
              {shift.spots_total - shift.spots_filled} of {shift.spots_total} spots available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
