import { describe, it, expect } from 'vitest'
import { DETAIL_TITLE_ID, isResourceCategory } from './resourceCategories'

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

describe('DETAIL_TITLE_ID', () => {
  it('is a non-empty id shared by the detail pane and its heading', () => {
    expect(DETAIL_TITLE_ID).toBeTruthy()
  })
})
