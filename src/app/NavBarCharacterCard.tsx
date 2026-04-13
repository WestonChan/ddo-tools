import { User, UserPen, ArrowUpDown, GitCompareArrows } from 'lucide-react'
import { useCharacter, formatClassSummary, formatRace } from '../features/character'
import type { View } from '../hooks'
import './NavBarCharacterCard.css'

interface NavBarCharacterCardProps {
  activeView: View
  onNavigate: (view: View) => void
}

export function NavBarCharacterCard({ activeView, onNavigate }: NavBarCharacterCardProps) {
  const { character: selected, activeBuild, lifeNumbers } = useCharacter()
  const raceLabel = activeBuild ? formatRace(activeBuild.race) : ''
  const classLabel = activeBuild ? formatClassSummary(activeBuild) : ''
  // Named planned builds use their name; unnamed lives fall back to "Life N"
  const buildLabel =
    activeBuild?.name ||
    (activeBuild ? `Life ${lifeNumbers.get(activeBuild.id) ?? '?'}` : 'No build')

  return (
    <div
      className="nav-bar-character-card"
      onClick={() => onNavigate('characters')}
    >
      {/* Character strip — identifies the owning character */}
      <div className={`nav-bar-character-strip${activeView === 'characters' ? ' active' : ''}`}>
        <User size={18} />
        <span className="nav-bar-character-strip-name nav-bar-collapsible">{selected.name}</span>
      </div>
      <div className="nav-bar-divider" />

      {/* Current build slot */}
      <div className="nav-bar-character-slot">
        <UserPen size={18} />
        <div className="nav-bar-character-info nav-bar-collapsible">
          <span className="nav-bar-character-name">{buildLabel}</span>
          {raceLabel && <span className="nav-bar-character-build">{raceLabel}</span>}
          {classLabel && <span className="nav-bar-character-build">{classLabel}</span>}
        </div>
      </div>

      {/* Divider + swap button between current and compare builds */}
      <div className="nav-bar-divider nav-bar-divider--swap">
        <button
          className="nav-bar-character-swap-btn"
          title="Swap active and comparison build"
        >
          <ArrowUpDown size={14} />
        </button>
      </div>

      {/* Compare slot (placeholder for Phase 7 compare mode) */}
      <div className="nav-bar-character-slot nav-bar-character-slot--empty">
        <button
          className="nav-bar-compare-btn"
          title="Compare builds (coming soon)"
        >
          <GitCompareArrows size={18} />
          <div className="nav-bar-character-info nav-bar-collapsible">
            <span className="nav-bar-character-name">Compare</span>
            <span className="nav-bar-character-build-placeholder" />
            <span className="nav-bar-character-build-placeholder" />
          </div>
        </button>
      </div>
    </div>
  )
}
