// Query cache timing constants
// Use these constants for consistent staleTime configuration across all React Query hooks

export const STALE_TIME = {
  /** 30 seconds - for live/real-time data like shift status, clock records */
  REALTIME: 1000 * 30,
  /** 2 minutes - for frequently changing data like lists, applications */
  SHORT: 1000 * 60 * 2,
  /** 5 minutes - for moderately stable data like stats, reports */
  MEDIUM: 1000 * 60 * 5,
  /** 15 minutes - for stable data like profiles, settings */
  LONG: 1000 * 60 * 15,
  /** 1 hour - for rarely changing data like user types, static config */
  VERY_LONG: 1000 * 60 * 60,
} as const

export type StaleTimeKey = keyof typeof STALE_TIME
