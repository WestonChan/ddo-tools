import { User, ArrowUpDown, GitCompareArrows } from 'lucide-react'
import { useCharacter, formatClassSummary, formatRace } from '../features/character'
import type { View } from '../hooks'
import './NavBarCharacterCard.css'

interface NavBarCharacterCardProps {
  activeView: View
  onNavigate: (view: View) => void
}

export function NavBarCharacterCard({ activeView, onNavigate }: NavBarCharacterCardProps) {
  const { character: selected, activeBuild } = useCharacter()
  const raceLabel = activeBuild ? formatRace(activeBuild.race) : ''
  const classLabel = activeBuild ? formatClassSummary(activeBuild) : ''

  return (
    <div
      className="nav-bar-character-card"
      onClick={() => onNavigate('characters')}
    >
      <div className={`nav-bar-character-slot${activeView === 'characters' ? ' active' : ''}`}>
        <User size={18} />
        <div className="nav-bar-character-info nav-bar-collapsible">
          <span className="nav-bar-character-name">{selected.name}</span>
          {raceLabel && <span className="nav-bar-character-build">{raceLabel}</span>}
          {classLabel && <span className="nav-bar-character-build">{classLabel}</span>}
        </div>
      </div>
      <div className="nav-bar-divider" />
      <button
        className="nav-bar-character-swap-btn"
        title="Swap active and comparison build"
        onClick={(e) => e.stopPropagation()}
      >
        <ArrowUpDown size={14} />
      </button>
      <div className="nav-bar-character-slot nav-bar-character-slot--empty">
        <button
          className="nav-bar-compare-btn"
          title="Compare builds (coming soon)"
          onClick={(e) => e.stopPropagation()}
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
