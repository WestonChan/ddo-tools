import type { JSX } from 'react'
import type { PlaceholderAbility } from '../data/placeholderAbilities'
import './AbilityCode.css'

interface AbilityCodeProps {
  ability: PlaceholderAbility
}

export function AbilityCode({ ability }: AbilityCodeProps): JSX.Element {
  return (
    <span className={`ability-code ability-code--${ability.damageType}`}>{ability.shortCode}</span>
  )
}
