import type { JSX } from 'react'
import { StructuredDetailCard } from '../../../components/DetailCard'
import type { PlaceholderAbility } from '../data/placeholderAbilities'
import './AbilityDetailCard.css'

export function AbilityDetailCard({ ability }: { ability: PlaceholderAbility }): JSX.Element {
  const facts = [
    { label: 'Type', value: ability.kind },
    { label: 'Cooldown', value: ability.cooldown },
    { label: 'Save', value: ability.save },
    { label: 'Damage', value: ability.damage },
    { label: 'Cost', value: ability.cost },
  ]
  return (
    <StructuredDetailCard
      variant="hover"
      kicker="Ability"
      name={ability.name}
      facts={facts}
      sections={[]}
      cardFooter={
        <footer className="ability-detail-card__damage-calc">
          Click → full breakdown in Damage calc
        </footer>
      }
    />
  )
}
