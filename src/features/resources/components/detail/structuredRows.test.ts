import { expect, it } from 'vitest'
import capturedAugment from '../../queries/fixtures/effects-augment-77.json'
import capturedItem from '../../queries/fixtures/effects-item-7631.json'
import capturedWeapon from '../../queries/fixtures/effects-item-3479.json'
import capturedShield from '../../queries/fixtures/effects-item-8203.json'
import capturedArmor from '../../queries/fixtures/effects-item-831.json'
import type { ApiAugmentDetail, ApiItemDetail } from '../../../../lib/api'
import { toAugmentDetail, toItem } from '../../queries/items'
import {
  effectHoverCopy,
  effectValue,
  damageExpression,
  itemEnhancementRow,
} from './structuredRows'

it('builds the item enhancement row and hover copy from captured weapon, shield and armor fields', () => {
  for (const [captured, description] of [
    [capturedWeapon, '+5 enhancement bonus to attack and damage rolls.'],
    [capturedShield, '+5 enhancement bonus to Armor Class, attack and damage rolls.'],
    [capturedArmor, '+5 enhancement bonus to Armor Class.'],
  ] as const) {
    const row = itemEnhancementRow(toItem(captured as ApiItemDetail))
    expect(row).toEqual({
      name: 'Enhancement Bonus',
      type: 'Enhancement',
      value: '+5',
      amount: 5,
      verboseName: '+5 Enhancement Bonus',
      description,
    })
    expect(effectHoverCopy(row!)).toEqual({ verboseName: '+5 Enhancement Bonus', description })
  }
})

it('omits zero and missing enhancement bonuses', () => {
  for (const amount of [0, null]) {
    const item = toItem({ ...capturedWeapon, enhancement_bonus: amount } as ApiItemDetail)
    expect(itemEnhancementRow(item)).toBeNull()
  }
})

it('formats both owner amounts when the effect has a second value', () => {
  expect(effectValue({ value: 17, value2: 5 })).toBe('+17 / +5')
})

it('formats dice from a captured augment response', () => {
  const augment = toAugmentDetail({
    ...(capturedAugment as unknown as ApiAugmentDetail),
    effects: [],
  })
  expect(damageExpression(augment.modifiers[0])).toBe('1d6 Electric')
  expect(damageExpression(augment.modifiers[1])).toBeNull()
})

it('carries the same API modifier shape through the item mapper', () => {
  const item = toItem({
    ...(capturedItem as ApiItemDetail),
    effects: [],
    modifiers: [capturedAugment.modifiers[0]],
  })
  expect(damageExpression(item.modifiers[0])).toBe('1d6 Electric')
})

it('formats percent, bonus and cap fields without reading description text', () => {
  const modifier = toAugmentDetail({
    ...(capturedAugment as unknown as ApiAugmentDetail),
    effects: [],
  }).modifiers[0]
  expect(
    damageExpression({
      ...modifier,
      diceNumber: [2],
      diceSides: [6],
      diceBonus: [3],
      damage: 'Fire',
      diceDamage: null,
      cap: '20',
    }),
  ).toBe('2d6 + 3 Fire · cap 20')
  expect(
    damageExpression({
      ...modifier,
      diceNumber: null,
      diceSides: null,
      amounts: [15],
      isPercent: true,
      damage: 'Fire',
      diceDamage: null,
    }),
  ).toBe('+15% Fire')
  expect(
    damageExpression({ ...modifier, diceNumber: null, diceSides: null, diceDamage: null }),
  ).toBeNull()
  expect(
    damageExpression({
      ...modifier,
      diceNumber: null,
      diceSides: null,
      diceDamage: null,
      cap: '20',
    }),
  ).toBeNull()
})
