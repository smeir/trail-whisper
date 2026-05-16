import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatDateTime, formatDistanceMeters, formatRelative } from './format'

describe('formatDistanceMeters', () => {
  it('rounds metre values below 1 km', () => {
    expect(formatDistanceMeters(0)).toBe('0 m')
    expect(formatDistanceMeters(4.4)).toBe('4 m')
    expect(formatDistanceMeters(999)).toBe('999 m')
  })

  it('switches to one-decimal kilometres at and above 1 km', () => {
    expect(formatDistanceMeters(1000)).toBe('1.0 km')
    expect(formatDistanceMeters(1500)).toBe('1.5 km')
    expect(formatDistanceMeters(12345)).toBe('12.3 km')
  })
})

describe('formatDateTime', () => {
  it('formats a wall-clock ISO timestamp (locale/TZ independent)', () => {
    // No trailing Z -> parseISO treats it as local time, so the rendered
    // wall-clock is stable regardless of the machine's timezone.
    expect(formatDateTime('2024-01-02T13:45:00')).toBe('Jan 2, 2024 13:45')
  })

  it('returns the original value for an invalid date', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date')
  })
})

describe('formatRelative', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a strict relative distance with a suffix', () => {
    const twoHoursAgo = new Date('2024-06-15T10:00:00Z').toISOString()
    expect(formatRelative(twoHoursAgo)).toBe('2 hours ago')
  })

  it('returns the original value for an invalid date', () => {
    expect(formatRelative('not-a-date')).toBe('not-a-date')
  })
})
