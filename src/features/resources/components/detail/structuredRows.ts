import type { ItemBonus, ResourceModifier } from '../../queries/items'
import { numberWithPlusSign } from './numberWithPlusSign'

export function bonusValue(bonus: Pick<ItemBonus, 'value' | 'value2'>): string | null {
  if (bonus.value === null) return null
  const firstValue = numberWithPlusSign(bonus.value)
  return bonus.value2 == null ? firstValue : `${firstValue} / ${numberWithPlusSign(bonus.value2)}`
}

export function damageExpression(modifier: ResourceModifier): string | null {
  if (modifier.effectType === 'WeaponOtherDamageBonusCritical') return null
  const diceIndex =
    modifier.diceNumber?.findIndex(
      (number, index) => number > 0 && (modifier.diceSides?.[index] ?? 0) > 0,
    ) ?? -1
  let expression: string | null = null
  if (diceIndex >= 0) {
    const number = modifier.diceNumber?.[diceIndex]
    const sides = modifier.diceSides?.[diceIndex]
    const bonus = modifier.diceBonus?.[diceIndex]
    expression = `${number}d${sides}${bonus ? ` ${bonus > 0 ? '+' : '-'} ${Math.abs(bonus)}` : ''}`
  } else if (modifier.isPercent) {
    const amount = modifier.amounts?.find((value) => value !== 0)
    if (amount !== undefined) expression = `${numberWithPlusSign(amount)}%`
  } else {
    const amount = modifier.amounts?.find((value) => value !== 0)
    if (modifier.damage && amount !== undefined) expression = numberWithPlusSign(amount)
  }
  const damageType = modifier.damage ?? modifier.diceDamage
  if (damageType) expression = [expression, damageType].filter(Boolean).join(' ')
  if (!expression) return null
  if (modifier.cap) expression = [expression, `cap ${modifier.cap}`].filter(Boolean).join(' · ')
  return expression
}
