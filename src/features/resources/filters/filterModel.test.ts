import { describe, expect, it } from 'vitest'
import { appliedFilterValues, clearedFilterValues, commitNumericRange } from './filterModel'
import type { FilterDefinition, NumericRange } from './filterModel'

interface TestFilterValues {
  ml: NumericRange
  slot: string
  bonuses: string[]
  isRareOnly: boolean
}

const definitions: FilterDefinition<TestFilterValues>[] = [
  {
    key: 'ml',
    label: 'ML',
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
  { key: 'isRareOnly', label: 'Rare only', kind: 'toggle' },
]

describe('filter model', () => {
  it('derives a separate removable entry for every applied value', () => {
    const values: TestFilterValues = {
      ml: { min: '20', max: '32' },
      slot: 'Back',
      bonuses: ['Strength', 'Constitution'],
      isRareOnly: true,
    }
    expect(appliedFilterValues(definitions, values).map(({ key, value }) => [key, value])).toEqual([
      ['ml', 'min'],
      ['ml', 'max'],
      ['slot', 'Back'],
      ['bonuses', 'Strength'],
      ['bonuses', 'Constitution'],
      ['isRareOnly', true],
    ])
    expect(clearedFilterValues(values, definitions[0], 'min').ml).toEqual({ min: '', max: '32' })
    expect(clearedFilterValues(values, definitions[2], 'Strength').bonuses).toEqual([
      'Constitution',
    ])
  })

  it('clamps, swaps, and accepts blank or invalid ML input', () => {
    expect(commitNumericRange('-8', '90', 1, 36)).toEqual({ min: '1', max: '36' })
    expect(commitNumericRange('32', '20', 1, 36)).toEqual({ min: '20', max: '32' })
    expect(commitNumericRange('', '20', 1, 36)).toEqual({ min: '', max: '20' })
    expect(commitNumericRange('garbage', 'Infinity', 1, 36)).toEqual({ min: '', max: '' })
    expect(commitNumericRange('4.7', '', 1, 36)).toEqual({ min: '5', max: '' })
  })
})
