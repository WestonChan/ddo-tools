import { describe, it, expect } from 'vitest'
import { formatSlotLabel } from './formatSlotLabel'

describe('formatSlotLabel', () => {
  it.each([
    ['red', 'Red'],
    ['colorless', 'Colorless'],
    ['sun', 'Sun'],
    ['moon', 'Moon'],
    ['lamordia: melancholic (accessory)', 'Lamordia: Melancholic (Accessory)'],
    ['isle of dread: fang (weapon)', 'Isle of Dread: Fang (Weapon)'],
    ['isle of dread: set bonus', 'Isle of Dread: Set Bonus'],
    ["slaver's: prefix (legendary)", "Slaver's: Prefix (Legendary)"],
    ["slaver's: bonus", "Slaver's: Bonus"],
  ])('renders %s as %s', (stored, displayed) => {
    expect(formatSlotLabel(stored)).toBe(displayed)
  })

  it('capitalizes the first letter, not the first character', () => {
    expect(formatSlotLabel('(legendary)')).toBe('(Legendary)')
  })

  it('capitalizes a small word when it leads the label', () => {
    expect(formatSlotLabel('of dread')).toBe('Of Dread')
  })
})
