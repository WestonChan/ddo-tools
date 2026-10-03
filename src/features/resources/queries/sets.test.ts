import { expect, it } from 'vitest'
import type { ApiSetDetail } from '../../../lib/api'
import capturedSet93 from './fixtures/set93.json'
import { toSetDetail } from './sets'

it('maps the captured set 93 response with its omitted bonuses and extra modifier types', () => {
  const set = toSetDetail(capturedSet93)
  expect(set.name).toBe('Adherent of the Mists Set (Heroic)')
  expect(set.items[0]).toEqual({ id: 487, name: 'Adversion', slot: 'Ring', minimumLevel: 10 })
  expect(set.tiers[0].equippedCount).toBe(5)
  expect(set.tiers[0].description).toBe('+5 Profane Bonus to Physical Resistance Rating.')
  expect(set.tiers[0].bonuses.map((bonus) => bonus.name)).toEqual([
    'Physical Resistance Rating',
    'Healing Amplification',
    'Negative Healing Amplification',
    'Repair Amplification',
    'Melee Power',
    'Ranged Power',
    'Universal Spell Power',
  ])
  expect(set.tiers[0].bonuses.every((bonus) => bonus.description === null)).toBe(true)
})

it('uses derived bonuses once and keeps only modifier effects they do not cover', () => {
  const apiSet: ApiSetDetail = {
    ...capturedSet93,
    tiers: [
      {
        ...capturedSet93.tiers[0],
        bonuses: [
          {
            id: 1,
            name: 'Physical Resistance Rating +5',
            stat: 'Physical Resistance Rating',
            stat_category: 'defensive',
            bonus_type: 'Profane',
            value: 5,
            value2: null,
            description: '+5 Profane Bonus to Physical Resistance Rating.',
          },
          {
            id: 2,
            name: 'Universal Spell Power +10',
            stat: 'Universal Spell Power',
            stat_category: 'magical',
            bonus_type: 'Profane',
            value: 10,
            value2: null,
            description: 'Profane bonus to Universal Spell Power.',
          },
          {
            id: 3,
            name: 'Healing Amplification +10',
            stat: 'Healing Amplification',
            stat_category: 'defensive',
            bonus_type: 'Profane',
            value: 10,
            value2: null,
            description: 'Profane bonus to Healing Amplification.',
          },
          {
            id: 4,
            name: 'Melee Power +5',
            stat: 'Melee Power',
            stat_category: 'offensive',
            bonus_type: 'Profane',
            value: 5,
            value2: null,
            description: 'Profane bonus to Melee Power.',
          },
        ],
      },
    ],
  }
  const bonuses = toSetDetail(apiSet).tiers[0].bonuses
  expect(bonuses.map((bonus) => bonus.name)).toEqual([
    'Physical Resistance Rating',
    'Universal Spell Power',
    'Healing Amplification',
    'Melee Power',
    'Negative Healing Amplification',
    'Repair Amplification',
    'Ranged Power',
  ])
  expect(bonuses.map((bonus) => bonus.description)).toEqual([
    '+5 Profane Bonus to Physical Resistance Rating.',
    'Profane bonus to Universal Spell Power.',
    'Profane bonus to Healing Amplification.',
    'Profane bonus to Melee Power.',
    null,
    null,
    null,
  ])
})
