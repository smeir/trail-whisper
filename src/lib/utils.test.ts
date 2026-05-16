import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('merges conflicting Tailwind utilities, last one wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('keeps non-conflicting utilities', () => {
    expect(cn('px-2', 'py-4', 'text-sm')).toBe('px-2 py-4 text-sm')
  })
})
