import { describe, it, expect } from 'vitest'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DETAIL_TITLE_ID,
  ENABLED_CATEGORIES,
  isCategory,
} from './types'

// Renamed from utils.test.ts: these assertions always covered types.ts (the
// old file's describe block even said 'resources/types'). utils.ts held a
// duplicate `isKnownCategory` and an `assertNever` that no production code
// ever called, so both were deleted along with the file.
describe('resources categories', () => {
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

describe('isCategory', () => {
  it('accepts every CATEGORIES value', () => {
    for (const c of CATEGORIES) {
      expect(isCategory(c)).toBe(true)
    }
  })

  it('rejects unknown strings', () => {
    expect(isCategory('nope')).toBe(false)
    expect(isCategory('')).toBe(false)
    expect(isCategory('ITEMS')).toBe(false)
  })
})

describe('DETAIL_TITLE_ID', () => {
  it('is a non-empty id shared by the drawer and its heading', () => {
    // ResourcesView points aria-labelledby at it and EntityHeader stamps it on
    // the <h2>; an empty value would silently break the dialog's name.
    expect(DETAIL_TITLE_ID).toBeTruthy()
  })
})
