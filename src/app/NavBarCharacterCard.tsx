import type { JSX } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { User, UserPen, ArrowUpDown, GitCompareArrows } from 'lucide-react'
import { useCharacters, classSplitLabel, raceLabelOf } from '../features/character'
import './NavBarCharacterCard.css'

interface NavBarCharacterCardProps {
  onNavigate?: () => void
}

function NavBarBuildSummary({
  Icon,
  name,
  raceAndClassLabels,
}: {
  Icon: React.FC<{ size?: number }>
  name: string
  raceAndClassLabels?: string[]
}): JSX.Element {
  return (
    <div className="nav-bar-character-slot">
      <Icon size={18} />
      <div className="nav-bar-character-info nav-bar-collapsible">
        <span className="nav-bar-character-name">{name}</span>
        {raceAndClassLabels ? (
          raceAndClassLabels.map((d, i) => (
            <span key={i} className="nav-bar-character-build">
              {d}
            </span>
          ))
        ) : (
          <>
            <span className="nav-bar-character-build-placeholder" />
            <span className="nav-bar-character-build-placeholder" />
          </>
        )}
      </div>
    </div>
  )
}

export function NavBarCharacterCard({ onNavigate }: NavBarCharacterCardProps): JSX.Element {
  const { selectedCharacter, viewedBuild, lifeNumbersByLifeId } = useCharacters()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const raceLabel = viewedBuild ? raceLabelOf(viewedBuild.race) : ''
  const classLabel = viewedBuild ? classSplitLabel(viewedBuild) : ''
  const buildLabel =
    viewedBuild?.name ||
    (viewedBuild ? `Life ${lifeNumbersByLifeId.get(viewedBuild.id) ?? '?'}` : 'No build')

  const isCharactersRouteActive = pathname === '/characters'
  const raceAndClassLabels = [raceLabel, classLabel].filter(Boolean)

  return (
    <div
      className={`nav-bar-character-card${isCharactersRouteActive ? ' active' : ''}`}
      onClick={() => {
        navigate({ to: '/characters' })
        onNavigate?.()
      }}
    >
      <div className="nav-bar-character-strip">
        <User size={18} />
        <span className="nav-bar-character-strip-name nav-bar-collapsible">
          {selectedCharacter.name}
        </span>
      </div>
      <div className="nav-bar-divider" />

      <NavBarBuildSummary
        Icon={UserPen}
        name={buildLabel}
        raceAndClassLabels={raceAndClassLabels.length > 0 ? raceAndClassLabels : undefined}
      />

      <div className="nav-bar-divider nav-bar-divider--swap">
        <button
          className="nav-bar-character-swap-btn"
          title="Swap active and comparison build"
          onClick={(e) => e.stopPropagation()}
        >
          <ArrowUpDown size={14} />
        </button>
      </div>

      <NavBarBuildSummary Icon={GitCompareArrows} name="Compare" />
    </div>
  )
}
