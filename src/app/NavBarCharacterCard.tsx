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

  const isActive = activeView === 'characters'

  return (
    <div
      className={`nav-bar-character-card${isActive ? ' active' : ''}`}
      onClick={() => onNavigate('characters')}
    >
      {/* Character strip — identifies the owning character */}
      <div className="nav-bar-character-strip">
        <User size={18} />
        <span className="nav-bar-character-strip-name nav-bar-collapsible">{selected.name}</span>
      </div>
      <div className="nav-bar-divider" />

      {/* Current build slot — always highlighted in accent to indicate the active build */}
      <div className="nav-bar-character-slot nav-bar-character-slot--current">
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
      <div className="nav-bar-character-slot">
        <GitCompareArrows size={18} />
        <div className="nav-bar-character-info nav-bar-collapsible">
          <span className="nav-bar-character-name">Compare</span>
          <span className="nav-bar-character-build-placeholder" />
          <span className="nav-bar-character-build-placeholder" />
        </div>
      </div>
    </div>
  )
}
