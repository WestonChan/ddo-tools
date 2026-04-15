import { User, UserPen, ArrowUpDown, GitCompareArrows } from 'lucide-react'
import { useCharacter, formatClassSummary, formatRace } from '../features/character'
import type { View } from '../hooks'
import './NavBarCharacterCard.css'

interface NavBarCharacterCardProps {
  activeView: View
  onNavigate: (view: View) => void
}

function NavBarBuildSlot({
  Icon,
  name,
  details,
}: {
  Icon: React.FC<{ size?: number }>
  name: string
  details?: string[]
}) {
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

export function NavBarCharacterCard({ activeView, onNavigate }: NavBarCharacterCardProps) {
  const { character: selected, activeBuild, lifeNumbers } = useCharacter()
  const raceLabel = activeBuild ? formatRace(activeBuild.race) : ''
  const classLabel = activeBuild ? formatClassSummary(activeBuild) : ''
  const buildLabel =
    activeBuild?.name ||
    (activeBuild ? `Life ${lifeNumbers.get(activeBuild.id) ?? '?'}` : 'No build')

  const isActive = activeView === 'characters'
  const buildDetails = [raceLabel, classLabel].filter(Boolean)

  return (
    <div
      className={`nav-bar-character-card${isActive ? ' active' : ''}`}
      onClick={() => onNavigate('characters')}
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
        >
          <ArrowUpDown size={14} />
        </button>
      </div>

      <NavBarBuildSlot Icon={GitCompareArrows} name="Compare" />
    </div>
  )
}
