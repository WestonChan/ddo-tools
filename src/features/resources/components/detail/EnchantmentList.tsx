import type { JSX } from 'react'
import { DetailSection } from './DetailSection'
import { formatSigned } from './formatSigned'
import type { ItemBonus, ItemEffect } from '../../queries/items'

interface EnchantmentListProps {
  bonuses: ItemBonus[]
  effects: ItemEffect[]
}

interface EnchantmentLine {
  key: string
  tag: string | null
  name: string
  value: string | null
  description: string | null
}

function bonusToLine(b: ItemBonus): EnchantmentLine {
  const description = b.description
  const name = b.stat_name
  const value = b.value !== null ? formatSigned(b.value) : null
  return {
    key: `b-${b.bonus_id}-${b.sort_order}`,
    tag: b.bonus_type,
    name,
    value,
    description: description && description !== b.name ? description : null,
  }
}

function effectToLine(e: ItemEffect): EnchantmentLine {
  const name = e.value !== null ? `${e.name} ${formatSigned(e.value)}` : e.name
  return {
    key: `e-${e.effect_id}-${e.sort_order}`,
    tag: e.target,
    name,
    value: null,
    description: e.description && e.description !== e.name ? e.description : null,
  }
}

export function EnchantmentList({ bonuses, effects }: EnchantmentListProps): JSX.Element | null {
  if (bonuses.length === 0 && effects.length === 0) return null

  const lines: EnchantmentLine[] = [
    ...bonuses.map(bonusToLine),
    ...effects.map(effectToLine),
  ]

  return (
    <DetailSection label="Enchantments">
      <ul className="resources-bonus-list">
        {lines.map((line) => (
          <li key={line.key} className="resources-bonus-row">
            <div className="resources-bonus-head">
              <span className="resources-bonus-type">{line.tag ?? ''}</span>
              <span className="resources-bonus-name">{line.name}</span>
              <span className="resources-bonus-value">{line.value ?? ''}</span>
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
