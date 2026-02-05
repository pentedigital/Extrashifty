/**
 * Calculate the duration in hours between two times
 * @param startTime - Start time in HH:MM or HH:MM:SS format
 * @param endTime - End time in HH:MM or HH:MM:SS format
 * @returns Duration in hours as a decimal number
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const parseTime = (time: string): number => {
    const parts = time.split(':')
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0
    return hours + minutes / 60 + seconds / 3600
  }

  const start = parseTime(startTime)
  let end = parseTime(endTime)

  // Handle shifts that cross midnight
  if (end < start) {
    end += 24
  }

  const duration = end - start

  // Round to 2 decimal places to avoid floating point issues
  return Math.round(duration * 100) / 100
}

/**
 * Format duration in hours to a human-readable string
 * @param hours - Duration in hours (can be decimal)
 * @returns Formatted string like "6 hours", "1 hour", "7.5 hours", "30 minutes"
 */
export function formatDuration(hours: number): string {
  if (hours === 0) {
    return '0 hours'
  }

  // Handle sub-hour durations
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return minutes === 1 ? '1 minute' : `${minutes} minutes`
  }

  // Handle exact hours
  if (Number.isInteger(hours)) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }

  // Handle fractional hours
  // Common fractions that look nice as decimals
  const roundedHours = Math.round(hours * 10) / 10

  // If it's a clean half hour, show as decimal
  if (Number.isInteger(roundedHours * 2)) {
    return `${roundedHours} hours`
  }

  // Otherwise, show hours and minutes separately for clarity
  const wholeHours = Math.floor(hours)
  const remainingMinutes = Math.round((hours - wholeHours) * 60)

  if (remainingMinutes === 0) {
    return wholeHours === 1 ? '1 hour' : `${wholeHours} hours`
  }

  const hourPart = wholeHours === 1 ? '1 hour' : `${wholeHours} hours`
  const minutePart = remainingMinutes === 1 ? '1 minute' : `${remainingMinutes} minutes`

  if (wholeHours === 0) {
    return minutePart
  }

  return `${hourPart} ${minutePart}`
}

/**
 * Format duration in hours to a short notation
 * @param hours - Duration in hours (can be decimal)
 * @returns Short formatted string like "6h", "1h", "7.5h", "30m"
 */
export function formatDurationShort(hours: number): string {
  if (hours === 0) {
    return '0h'
  }

  // Handle sub-hour durations
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}m`
  }

  // Round to 1 decimal place for display
  const rounded = Math.round(hours * 10) / 10

  // If it's a whole number or clean decimal, show simple format
  if (Number.isInteger(rounded) || Number.isInteger(rounded * 2)) {
    return `${rounded}h`
  }

  // For non-clean decimals, show hours and minutes
  const wholeHours = Math.floor(hours)
  const remainingMinutes = Math.round((hours - wholeHours) * 60)

  if (remainingMinutes === 0) {
    return `${wholeHours}h`
  }

  if (wholeHours === 0) {
    return `${remainingMinutes}m`
  }

  return `${wholeHours}h ${remainingMinutes}m`
}

/**
 * Calculate duration from start and end time strings and format it
 * @param startTime - Start time in HH:MM or HH:MM:SS format
 * @param endTime - End time in HH:MM or HH:MM:SS format
 * @returns Formatted duration string
 */
export function getFormattedDuration(startTime: string, endTime: string): string {
  const hours = calculateDuration(startTime, endTime)
  return formatDuration(hours)
}

/**
 * Calculate duration from start and end time strings and format it in short notation
 * @param startTime - Start time in HH:MM or HH:MM:SS format
 * @param endTime - End time in HH:MM or HH:MM:SS format
 * @returns Short formatted duration string
 */
export function getFormattedDurationShort(startTime: string, endTime: string): string {
  const hours = calculateDuration(startTime, endTime)
  return formatDurationShort(hours)
}
