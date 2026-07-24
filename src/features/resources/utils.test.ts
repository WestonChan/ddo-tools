import { describe, it, expect } from 'vitest'
import { CATEGORIES, CATEGORY_LABELS, ENABLED_CATEGORIES } from './types'
import { isKnownCategory, assertNever } from './utils'

describe('resources/types', () => {
  it('CATEGORIES has a label for every variant', () => {
    for (const c of CATEGORIES) {
      expect(CATEGORY_LABELS[c]).toBeTruthy()
    }
  })

  it('CATEGORY_LABELS keys exactly match CATEGORIES', () => {
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual([...CATEGORIES].sort())
  })

  it('ENABLED_CATEGORIES is a subset of CATEGORIES', () => {
    for (const c of ENABLED_CATEGORIES) {
      expect((CATEGORIES as readonly string[]).includes(c)).toBe(true)
    }
  })
})

describe('isKnownCategory', () => {
  it('accepts every CATEGORIES value', () => {
    for (const c of CATEGORIES) {
      expect(isKnownCategory(c)).toBe(true)
    }
  })

  it('rejects unknown strings', () => {
    expect(isKnownCategory('nope')).toBe(false)
    expect(isKnownCategory('')).toBe(false)
    expect(isKnownCategory('ITEMS')).toBe(false)
  })
})

describe('assertNever', () => {
  it('throws when called', () => {
    expect(() => assertNever('something' as never)).toThrow(/unhandled category/)
  })
})
