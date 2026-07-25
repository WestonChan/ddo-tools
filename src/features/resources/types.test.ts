import { describe, it, expect } from 'vitest'
import { DETAIL_TITLE_ID, isCategory } from './types'

// Deliberately small: `CATEGORY_LABELS: Record<Category, string>` and
// `ENABLED_CATEGORIES: ReadonlySet<Category>` make label-coverage and
// subset-ness compile-time guarantees, so runtime assertions for them can
// never fail and were removed. Only the runtime behavior worth guarding
// lives here.
describe('isCategory', () => {
  it('rejects unknown strings (including case mismatches)', () => {
    expect(isCategory('nope')).toBe(false)
    expect(isCategory('')).toBe(false)
    expect(isCategory('ITEMS')).toBe(false)
  })

  it('accepts a known category string', () => {
    expect(isCategory('items')).toBe(true)
  })
})

describe('DETAIL_TITLE_ID', () => {
  it('is a non-empty id shared by the drawer and its heading', () => {
    // ResourcesView points aria-labelledby at it and EntityHeader stamps it on
    // the <h2>; an empty value would silently break the dialog's name.
    expect(DETAIL_TITLE_ID).toBeTruthy()
  })
})
