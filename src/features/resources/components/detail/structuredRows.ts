import type { ApiEffectDetail } from '../../../../lib/api'
import type { Effect, EffectBonus, EffectDamage, Item, ResourceModifier } from '../../queries/items'
import { numberWithPlusSign } from './numberWithPlusSign'

export interface ItemEnhancementRow {
  name: string
  type: string
  value: string
  amount: number
  verboseName: string
  description: string | null
}

export function itemEnhancementRow(
  item: Pick<Item, 'enhancementBonus' | 'category' | 'type'>,
): ItemEnhancementRow | null {
  const amount = item.enhancementBonus
  if (amount === null || amount === 0) return null
  const value = numberWithPlusSign(amount)
  const isShield = item.category === 'Shield' || /\b(?:shield|buckler)\b/i.test(item.type ?? '')
  const description = isShield
    ? `${value} enhancement bonus to Armor Class, attack and damage rolls.`
    : item.category === 'Weapon'
      ? `${value} enhancement bonus to attack and damage rolls.`
      : item.category === 'Armor'
        ? `${value} enhancement bonus to Armor Class.`
        : null
  return {
    name: 'Enhancement Bonus',
    type: 'Enhancement',
    value,
    amount,
    verboseName: `${value} Enhancement Bonus`,
    description,
  }
}

export function effectValue(effect: Pick<Effect, 'value' | 'value2'>): string | null {
  if (effect.value === null) return null
  const firstValue = numberWithPlusSign(effect.value)
  return effect.value2 == null ? firstValue : `${firstValue} / ${numberWithPlusSign(effect.value2)}`
}

export function effectHoverCopy(effect: Pick<Effect, 'name' | 'verboseName' | 'description'>): {
  verboseName: string | null
  description: string | null
} {
  return {
    verboseName: effect.verboseName === effect.name ? null : effect.verboseName,
    description:
      effect.description && effect.description !== effect.verboseName ? effect.description : null,
  }
}

export function isCalculatedEffectBonus(bonus: EffectBonus): boolean {
  return bonus.scale !== 1 || bonus.amountSource !== 'owner'
}

export function effectBonusCalculation(
  effect: Effect,
  bonus: EffectBonus,
  detail?: ApiEffectDetail,
): string | null {
  if (!isCalculatedEffectBonus(bonus)) return null
  const rule = detail?.bonuses.find(
    (candidate) =>
      candidate.target === (bonus.group?.name ?? bonus.statName) &&
      (candidate.bonus_type == null || candidate.bonus_type === bonus.bonusType),
  )
  if (bonus.amountSource === 'constant')
    return `${effect.name}: Fixed at ${numberWithPlusSign(bonus.value)} by the effect`
  const sourceAmount =
    bonus.amountSource === 'default'
      ? rule?.amount_from === 2
        ? detail?.default_value2
        : detail?.default_value
      : rule?.amount_from === 2
        ? effect.value2
        : effect.value
  const source = bonus.amountSource === 'default' ? 'the effect default' : 'the owner value'
  const sourceLabel =
    bonus.amountSource === 'default' && sourceAmount != null
      ? `${sourceAmount} (effect default)`
      : (sourceAmount ?? source)
  if (bonus.scale === 1) {
    return `${effect.name}: Uses ${source}${sourceAmount == null ? '' : ` (${sourceAmount})`}`
  }
  const scaledAmount =
    bonus.scale === 0.5
      ? `half of ${sourceLabel}`
      : bonus.scale === 2
        ? `twice ${sourceLabel}`
        : `${sourceLabel} × ${bonus.scale}`
  const rounding =
    rule?.rounding === 'up'
      ? ', rounded up'
      : rule?.rounding === 'down'
        ? ', rounded down'
        : rule?.rounding === 'nearest'
          ? ', rounded to the nearest whole number'
          : ''
  return `${effect.name}: ${scaledAmount}${rounding}`
}

export function effectDamageText(damage: EffectDamage): string {
  const dice = `${damage.diceNumber}d${damage.diceSides}`
  const bonus =
    damage.diceBonus === 0
      ? ''
      : damage.diceBonus > 0
        ? `+${damage.diceBonus}`
        : String(damage.diceBonus)
  const scaling = damage.scale === 1 ? '' : ` · ×${damage.scale}`
  return `${damage.trigger}: ${dice}${bonus} ${damage.damageType}${scaling}`
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
