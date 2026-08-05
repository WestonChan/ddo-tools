import { describe, it, expect } from 'vitest'
import { formatSlotLabel } from './formatSlotLabel'

// The inputs are the whole stored vocabulary — `augment_slot_types.label` is
// lower-case by construction (the pipeline matches it against
// `augments.slot_color`), so these are the only strings this ever sees.
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
    // The qualifier arrives parenthesised, so charAt(0) is "(".
    expect(formatSlotLabel('(legendary)')).toBe('(Legendary)')
  })

  it('capitalizes a small word when it leads the label', () => {
    // "of" stays lower-case mid-label only — a label can never open on one,
    // but the rule is written so the first word is always capitalized.
    expect(formatSlotLabel('of dread')).toBe('Of Dread')
  })
})
