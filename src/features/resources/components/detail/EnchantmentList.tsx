import type { JSX } from 'react'
import { DetailSection } from './DetailSection'
import { numberWithPlusSign } from './numberWithPlusSign'
import type { ItemBonus, ItemEffect } from '../../queries/items'

interface EnchantmentListProps {
  bonuses: ItemBonus[]
  effects: ItemEffect[]
}

interface EnchantmentLine {
  key: string
  tag: string | null
  name: string
  signedValue: string | null
  description: string | null
}

function toBonusLine(bonus: ItemBonus): EnchantmentLine {
  const description = bonus.description
  const name = bonus.statName
  const signedValue = bonus.value !== null ? numberWithPlusSign(bonus.value) : null
  return {
    key: `b-${bonus.id}-${bonus.sortOrder}`,
    tag: bonus.bonusType,
    name,
    signedValue,
    description: description && description !== bonus.name ? description : null,
  }
}

function toEffectLine(effect: ItemEffect): EnchantmentLine {
  const name = effect.value !== null ? `${effect.name} ${numberWithPlusSign(effect.value)}` : effect.name
  return {
    key: `e-${effect.id}-${effect.sortOrder}`,
    tag: effect.target,
    name,
    signedValue: null,
    description: effect.description && effect.description !== effect.name ? effect.description : null,
  }
}

export function EnchantmentList({ bonuses, effects }: EnchantmentListProps): JSX.Element | null {
  if (bonuses.length === 0 && effects.length === 0) return null

  const lines: EnchantmentLine[] = [
    ...bonuses.map(toBonusLine),
    ...effects.map(toEffectLine),
  ]

  return (
    <DetailSection heading="Enchantments">
      <ul className="resources-bonus-list">
        {lines.map((line) => (
          <li key={line.key} className="resources-bonus-row">
            <div className="resources-bonus-head">
              <span className="resources-bonus-type">{line.tag ?? ''}</span>
              <span className="resources-bonus-name">{line.name}</span>
              <span className="resources-bonus-value">{line.signedValue ?? ''}</span>
            </div>
            {line.description && (
              <p className="resources-bonus-description">{line.description}</p>
            )}
          </li>
        ))}
      </ul>
    </DetailSection>
  )
}
