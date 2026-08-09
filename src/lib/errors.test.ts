import { describe, expect, it } from 'vitest'

import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('reads the message off a plain object', () => {
    // Supabase resolves failures as plain objects, not Error instances — an
    // `instanceof Error` test would silently drop every one of these.
    const rlsFailure = {
      message: 'new row violates row-level security policy for table "activities"',
      details: null,
      hint: null,
      code: '42501',
    }

    expect(errorMessage(rlsFailure, 'Upload failed')).toBe(
      'new row violates row-level security policy for table "activities"',
    )
  })

  it('reads the message off an Error', () => {
    expect(errorMessage(new Error('You must be signed in.'), 'fallback')).toBe('You must be signed in.')
  })

  it('falls back for values that carry no usable message', () => {
    expect(errorMessage(null, 'fallback')).toBe('fallback')
    expect(errorMessage(undefined, 'fallback')).toBe('fallback')
    expect(errorMessage('boom', 'fallback')).toBe('fallback')
    expect(errorMessage({ code: '500' }, 'fallback')).toBe('fallback')
    expect(errorMessage({ message: '' }, 'fallback')).toBe('fallback')
    expect(errorMessage({ message: 42 }, 'fallback')).toBe('fallback')
    expect(errorMessage(new Error(''), 'fallback')).toBe('fallback')
  })
})
