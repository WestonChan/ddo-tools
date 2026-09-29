import { describe, it, expect } from 'vitest'
import { DETAIL_DRAWER_TITLE_ID, isResourceCategory } from './resourceCategories'

describe('isResourceCategory', () => {
  it('rejects unknown strings (including case mismatches)', () => {
    expect(isResourceCategory('nope')).toBe(false)
    expect(isResourceCategory('')).toBe(false)
    expect(isResourceCategory('ITEMS')).toBe(false)
  })

  it('accepts a known category string', () => {
    expect(isResourceCategory('items')).toBe(true)
  })
})

describe('DETAIL_DRAWER_TITLE_ID', () => {
  it('is a non-empty id shared by the drawer and its heading', () => {
    expect(DETAIL_DRAWER_TITLE_ID).toBeTruthy()
  })
})
