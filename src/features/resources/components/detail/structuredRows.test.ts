import { expect, it } from 'vitest'
import capturedAugment from '../../queries/fixtures/augment77.json'
import capturedItem from '../../queries/fixtures/item7631.json'
import capturedDualValueItem from '../../queries/fixtures/item483.json'
import type { ApiAugmentDetail, ApiItemDetail } from '../../../../lib/api'
import { toAugmentDetail, toItem } from '../../queries/items'
import { bonusValue, damageExpression } from './structuredRows'

it('formats a captured item bonus with its second value', () => {
  const item = toItem(capturedDualValueItem as ApiItemDetail)
  const speed = item.bonuses.find((bonus) => bonus.statName === 'Speed')
  expect(speed && bonusValue(speed)).toBe('+17 / +5')
})

it('formats dice from a captured augment response', () => {
  const augment = toAugmentDetail(capturedAugment as ApiAugmentDetail)
  expect(damageExpression(augment.modifiers[0])).toBe('1d6 Electric')
  expect(damageExpression(augment.modifiers[1])).toBeNull()
})

it('carries the same API modifier shape through the item mapper', () => {
  const item = toItem({
    ...(capturedItem as ApiItemDetail),
    modifiers: [capturedAugment.modifiers[0]],
  })
  expect(damageExpression(item.modifiers[0])).toBe('1d6 Electric')
})

it('formats percent, bonus and cap fields without reading description text', () => {
  const modifier = toAugmentDetail(capturedAugment as ApiAugmentDetail).modifiers[0]
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
