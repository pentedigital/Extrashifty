'use client'

import * as React from 'react'
import { Check, Clock, X, ShieldCheck, FileSearch, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

type VerificationState = boolean | 'pending'

export interface VerificationBadgesProps {
  /** Whether ID has been verified */
  isIdVerified?: VerificationState
  /** Whether background check has been completed */
  isBackgroundChecked?: VerificationState
  /** Whether right to work has been verified */
  isRightToWorkVerified?: VerificationState
  /** Size of the badges */
  size?: 'sm' | 'md' | 'lg'
  /** Show labels next to icons */
  showLabels?: boolean
  /** Additional CSS classes */
  className?: string
}

interface BadgeConfig {
  icon: React.ElementType
  label: string
  verifiedTooltip: string
  pendingTooltip: string
  notVerifiedTooltip: string
}

const badgeConfigs: Record<string, BadgeConfig> = {
  id: {
    icon: ShieldCheck,
    label: 'ID',
    verifiedTooltip: 'ID Verified',
    pendingTooltip: 'ID Verification Pending',
    notVerifiedTooltip: 'ID Not Verified',
  },
  background: {
    icon: FileSearch,
    label: 'Background',
    verifiedTooltip: 'Background Check Passed',
    pendingTooltip: 'Background Check Pending',
    notVerifiedTooltip: 'Background Check Not Completed',
  },
  rightToWork: {
    icon: Briefcase,
    label: 'Right to Work',
    verifiedTooltip: 'Right to Work Verified',
    pendingTooltip: 'Right to Work Verification Pending',
    notVerifiedTooltip: 'Right to Work Not Verified',
  },
}

const sizeClasses = {
  sm: {
    container: 'gap-1',
    badge: 'h-6 px-1.5',
    icon: 'h-3.5 w-3.5',
    statusIcon: 'h-3 w-3',
    text: 'text-xs',
  },
  md: {
    container: 'gap-1.5',
    badge: 'h-7 px-2',
    icon: 'h-4 w-4',
    statusIcon: 'h-3.5 w-3.5',
    text: 'text-sm',
  },
  lg: {
    container: 'gap-2',
    badge: 'h-8 px-2.5',
    icon: 'h-5 w-5',
    statusIcon: 'h-4 w-4',
    text: 'text-sm',
  },
}

interface SingleBadgeProps {
  config: BadgeConfig
  state: VerificationState
  size: 'sm' | 'md' | 'lg'
  showLabel: boolean
}

function SingleBadge({ config, state, size, showLabel }: SingleBadgeProps) {
  const [showTooltip, setShowTooltip] = React.useState(false)
  const sizes = sizeClasses[size]
  const Icon = config.icon

  const isVerified = state === true
  const isPending = state === 'pending'

  const StatusIcon = isVerified ? Check : isPending ? Clock : X

  const tooltip = isVerified
    ? config.verifiedTooltip
    : isPending
    ? config.pendingTooltip
    : config.notVerifiedTooltip

  const containerStyles = cn(
    'relative inline-flex items-center rounded-full border transition-colors',
    sizes.badge,
    isVerified && 'bg-green-50 border-green-200 text-green-700',
    isPending && 'bg-yellow-50 border-yellow-200 text-yellow-700',
    !isVerified && !isPending && 'bg-gray-50 border-gray-200 text-gray-500'
  )

  const statusIconStyles = cn(
    sizes.statusIcon,
    isVerified && 'text-green-600',
    isPending && 'text-yellow-600',
    !isVerified && !isPending && 'text-gray-400'
  )

  return (
    <div
      className={containerStyles}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="status"
      aria-label={tooltip}
    >
      <Icon className={sizes.icon} />
      {showLabel && <span className={cn('ml-1', sizes.text)}>{config.label}</span>}
      <StatusIcon className={cn('ml-1', statusIconStyles)} />

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-50 pointer-events-none"
          role="tooltip"
        >
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}

export function VerificationBadges({
  isIdVerified = false,
  isBackgroundChecked = false,
  isRightToWorkVerified = false,
  size = 'md',
  showLabels = false,
  className,
}: VerificationBadgesProps) {
  const sizes = sizeClasses[size]

  const badges = [
    { key: 'id', state: isIdVerified, config: badgeConfigs.id },
    { key: 'background', state: isBackgroundChecked, config: badgeConfigs.background },
    { key: 'rightToWork', state: isRightToWorkVerified, config: badgeConfigs.rightToWork },
  ]

  return (
    <div className={cn('inline-flex items-center flex-wrap', sizes.container, className)}>
      {badges.map(({ key, state, config }) => (
        <SingleBadge
          key={key}
          config={config}
          state={state}
          size={size}
          showLabel={showLabels}
        />
      ))}
    </div>
  )
}
