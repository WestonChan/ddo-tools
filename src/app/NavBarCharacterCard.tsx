import type { JSX } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { User, UserPen, ArrowUpDown, GitCompareArrows } from 'lucide-react'
import { useCharacter, formatClassSummary, formatRace } from '../features/character'
import './NavBarCharacterCard.css'

interface NavBarCharacterCardProps {
  onNavClick?: () => void
}

function NavBarBuildSlot({
  Icon,
  name,
  details,
}: {
  Icon: React.FC<{ size?: number }>
  name: string
  details?: string[]
}): JSX.Element {
  return (
    <div className="nav-bar-character-slot">
      <Icon size={18} />
      <div className="nav-bar-character-info nav-bar-collapsible">
        <span className="nav-bar-character-name">{name}</span>
        {details
          ? details.map((d, i) => <span key={i} className="nav-bar-character-build">{d}</span>)
          : <>
              <span className="nav-bar-character-build-placeholder" />
              <span className="nav-bar-character-build-placeholder" />
            </>
        }
      </div>
    </div>
  )
}

export function NavBarCharacterCard({ onNavClick }: NavBarCharacterCardProps): JSX.Element {
  const { character: selected, activeBuild, lifeNumbers } = useCharacter()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const raceLabel = activeBuild ? formatRace(activeBuild.race) : ''
  const classLabel = activeBuild ? formatClassSummary(activeBuild) : ''
  const buildLabel =
    activeBuild?.name ||
    (activeBuild ? `Life ${lifeNumbers.get(activeBuild.id) ?? '?'}` : 'No build')

  const isActive = pathname === '/characters'
  const buildDetails = [raceLabel, classLabel].filter(Boolean)

  // Kept as a <div> rather than <Link>: the card contains a nested swap
  // <button> (Phase 9 compare-mode hook), and <button> inside <a> is invalid
  // HTML. Programmatic navigate avoids the nesting issue without changing
  // current behavior (entire-card click target).
  return (
    <div
      className={`nav-bar-character-card${isActive ? ' active' : ''}`}
      onClick={() => {
        navigate({ to: '/characters' })
        onNavClick?.()
      }}
    >
      <div className="nav-bar-character-strip">
        <User size={18} />
        <span className="nav-bar-character-strip-name nav-bar-collapsible">{selected.name}</span>
      </div>
      <div className="nav-bar-divider" />

      <NavBarBuildSlot
        Icon={UserPen}
        name={buildLabel}
        details={buildDetails.length > 0 ? buildDetails : undefined}
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

      <NavBarBuildSlot Icon={GitCompareArrows} name="Compare" />
    </div>
  )
}
