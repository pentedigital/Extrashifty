import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate, formatTime, formatDateRange } from './utils'

describe('cn (className utility)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    const condition = false
    expect(cn('foo', condition && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats EUR currency by default', () => {
    const result = formatCurrency(100)
    expect(result).toMatch(/€/)
    expect(result).toMatch(/100/)
  })

  it('handles decimal amounts', () => {
    const result = formatCurrency(99.99)
    expect(result).toMatch(/99/)
  })

  it('handles zero', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/€/)
    expect(result).toMatch(/0/)
  })

  it('handles negative amounts', () => {
    const result = formatCurrency(-50)
    expect(result).toMatch(/50/)
  })

  it('supports different currencies', () => {
    const result = formatCurrency(100, 'USD')
    expect(result).toBeDefined()
  })
})

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2026-02-07')
    expect(result).toContain('Feb')
    expect(result).toContain('7')
  })

  it('formats Date object', () => {
    const date = new Date('2026-02-07')
    const result = formatDate(date)
    expect(result).toContain('Feb')
  })

  it('includes weekday', () => {
    const result = formatDate('2026-02-07')
    expect(result).toMatch(/Sat|Sun|Mon|Tue|Wed|Thu|Fri/)
  })
})

describe('formatTime', () => {
  it('formats afternoon time', () => {
    const result = formatTime('18:00')
    expect(result.toLowerCase()).toMatch(/6.*pm/i)
  })

  it('formats morning time', () => {
    const result = formatTime('09:30')
    expect(result.toLowerCase()).toMatch(/9.*30.*am/i)
  })

  it('handles midnight', () => {
    const result = formatTime('00:00')
    expect(result.toLowerCase()).toMatch(/12.*am/i)
  })

  it('handles noon', () => {
    const result = formatTime('12:00')
    expect(result.toLowerCase()).toMatch(/12.*pm/i)
  })
})

describe('formatDateRange', () => {
  it('combines date and time range', () => {
    const result = formatDateRange('2026-02-07', '18:00', '00:00')
    expect(result).toContain('Feb')
    expect(result).toContain('7')
    expect(result).toContain('-')
  })
})
