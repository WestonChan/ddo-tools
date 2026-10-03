import { describe, expect, it } from 'vitest'
import {
  appliedFilterValues,
  clearedFilterValues,
  commitNumericRange,
  filterChipHint,
  filterChipText,
} from './filterModel'
import type { FilterDefinition, NumericRange } from './filterModel'

interface TestFilterValues {
  ml: NumericRange
  slot: string
  bonuses: string[]
  isRareOnly: boolean
  isRaidOnly: boolean
}

const definitions: FilterDefinition<TestFilterValues>[] = [
  {
    key: 'ml',
    label: 'ML range',
    shortLabel: 'ML',
    kind: 'range',
    range: {
      minLabel: 'Min',
      maxLabel: 'Max',
      minimum: 1,
      maximum: 36,
      minPlaceholder: '1',
      maxPlaceholder: '36',
      hint: '',
    },
  },
  { key: 'slot', label: 'Slot', kind: 'single', options: [] },
  { key: 'bonuses', label: 'Bonuses', kind: 'multi', options: [] },
  { key: 'isRareOnly', label: 'Rare only', kind: 'toggle', appliedGroupLabel: 'Show' },
  { key: 'isRaidOnly', label: 'Raid only', kind: 'toggle', appliedGroupLabel: 'Show' },
]

describe('filter model', () => {
  it('derives one removable ML entry and one entry for each other applied value', () => {
    const values: TestFilterValues = {
      ml: { min: '20', max: '32' },
      slot: 'Back',
      bonuses: ['Strength', 'Constitution'],
      isRareOnly: true,
      isRaidOnly: true,
    }
    expect(
      appliedFilterValues(definitions, values).map(({ key, value, text }) => [key, value, text]),
    ).toEqual([
      ['ml', null, '20–32'],
      ['slot', 'Back', 'Back'],
      ['bonuses', 'Strength', 'Strength'],
      ['bonuses', 'Constitution', 'Constitution'],
      ['isRareOnly', true, 'Rare only'],
      ['isRaidOnly', true, 'Raid only'],
    ])
    expect(clearedFilterValues(values, definitions[0], null).ml).toEqual({ min: '', max: '' })
    expect(clearedFilterValues(values, definitions[2], 'Strength').bonuses).toEqual([
      'Constitution',
    ])
  })

  it('shows either single ML bound in one pill and keeps group labels separate from values', () => {
    const values: TestFilterValues = {
      ml: { min: '20', max: '' },
      slot: '',
      bonuses: [],
      isRareOnly: false,
      isRaidOnly: true,
    }
    expect(
      appliedFilterValues(definitions, values).map(({ groupLabel, text }) => [groupLabel, text]),
    ).toEqual([
      ['ML', '≥ 20'],
      ['Show', 'Raid only'],
    ])
    values.ml = { min: '', max: '32' }
    expect(appliedFilterValues(definitions, values)[0].text).toBe('≤ 32')
  })

  it('keeps single and multi chip labels while hints expose the selected values', () => {
    expect(filterChipText(definitions[1], 'Back')).toBe('Slot')
    expect(filterChipHint(definitions[1], 'Back')).toBe('Slot: Back')
    expect(filterChipText(definitions[2], ['Strength'])).toBe('Bonuses')
    expect(filterChipHint(definitions[2], ['Strength'])).toBe('Bonuses: Strength')
  })

  it('clamps, swaps, and accepts blank or invalid ML input', () => {
    expect(commitNumericRange('-8', '90', 1, 36)).toEqual({ min: '1', max: '36' })
    expect(commitNumericRange('32', '20', 1, 36)).toEqual({ min: '20', max: '32' })
    expect(commitNumericRange('', '20', 1, 36)).toEqual({ min: '', max: '20' })
    expect(commitNumericRange('garbage', 'Infinity', 1, 36)).toEqual({ min: '', max: '' })
    expect(commitNumericRange('4.7', '', 1, 36)).toEqual({ min: '5', max: '' })
  })
})
