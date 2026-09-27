import { describe, it, expect } from 'vitest'
import { DETAIL_TITLE_ID, isCategory } from './types'

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
    expect(DETAIL_TITLE_ID).toBeTruthy()
  })
})
