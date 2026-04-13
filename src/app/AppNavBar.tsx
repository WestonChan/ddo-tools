import {
  Swords,
  ShieldHalf,
  User,
  Settings,
  TableProperties,
  Sparkles,
  GitBranch,
  Skull,
  Orbit,
  Calculator,
  ListOrdered,
  ListTodo,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  NotepadText,
  GitCompareArrows,
  ArrowUpDown,
} from 'lucide-react'
import { useCharacter, formatClassSummary, formatRace } from '../features/character'
import type { View } from '../hooks'
import './AppNavBar.css'

// --- Navigation structure ---

interface NavItem {
  id?: string
  view: View
  label: string
  Icon: React.FC<{ size?: number }>
}

interface NavGroup {
  id: string
  label: string
  view?: View
  Icon?: React.FC<{ size?: number }>
  items: NavItem[]
}

type NavBarEntry = NavItem | NavGroup

function isGroup(entry: NavBarEntry): entry is NavGroup {
  return typeof entry === 'object' && 'items' in entry
}

function SkillsIcon(props: { size?: number }) {
  return <TableProperties {...props} style={{ transform: 'scaleX(-1)' }} />
}

const MAIN_NAV: NavBarEntry[] = [
  {
    id: 'build-plan',
    label: 'Build Plan',
    view: 'build-plan',
    Icon: NotepadText,
    items: [
      { id: 'levels', view: 'build-plan', label: 'Level Plan', Icon: ListOrdered },
      { id: 'skills', view: 'build-plan', label: 'Skills', Icon: SkillsIcon },
      { id: 'spells', view: 'build-plan', label: 'Spells', Icon: Sparkles },
      { id: 'enhancements', view: 'build-plan', label: 'Enhancements', Icon: GitBranch },
      { id: 'reaper', view: 'build-plan', label: 'Reaper', Icon: Skull },
      { id: 'destinies', view: 'build-plan', label: 'Destinies', Icon: Orbit },
      { view: 'gear', label: 'Gear', Icon: ShieldHalf },
      { view: 'overview', label: 'Build Overview', Icon: Swords },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { view: 'damage-calc', label: 'Damage Calc', Icon: Calculator },
      { view: 'farm-checklist', label: 'Farm Checklist', Icon: ListTodo },
      { view: 'debug', label: 'Debug', Icon: Search },
    ],
  },
]

// --- Component ---

interface AppNavBarProps {
  activeView: View
  onViewChange: (view: View) => void
  expanded: boolean
  onToggleExpanded: () => void
}

function AppNavBar({ activeView, onViewChange, expanded, onToggleExpanded }: AppNavBarProps) {
  const { character: selected, activeBuild } = useCharacter()
  const raceLabel = activeBuild ? formatRace(activeBuild.race) : ''
  const classLabel = activeBuild ? formatClassSummary(activeBuild) : ''

  function groupContainsActive(group: NavGroup): boolean {
    return group.items.some((item) => item.view === activeView)
  }

  // At narrow widths the expanded nav bar is full-screen; auto-close on navigate
  function handleNavigate(view: View) {
    onViewChange(view)
    if (expanded && window.innerWidth < 600) {
      onToggleExpanded()
    }
  }

  return (
    <aside className={`app-nav-bar${expanded ? ' expanded' : ''}`}>
      <div className="nav-bar-scroll">
        <div className="nav-bar-brand">
          <span className="nav-bar-brand-text nav-bar-collapsible">DDO<br />Builder</span>
        </div>

        <div
          className="nav-bar-character-card"
          onClick={() => handleNavigate('characters')}
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

        <nav className="nav-bar-items">
          {MAIN_NAV.map((entry) => {
            if (isGroup(entry)) {
              const hasActive = groupContainsActive(entry)
              return (
                <div key={entry.id} className="nav-bar-group">
                  <span className={`nav-bar-group-label${hasActive ? ' has-active' : ''}`}>
                    <span className="nav-bar-group-label-text nav-bar-collapsible">{entry.label}</span>
                  </span>
                  {entry.view && entry.Icon && (
                    <NavButton
                      item={{ view: entry.view, label: entry.label, Icon: entry.Icon }}
                      active={entry.items.some((item) => item.id && item.view === activeView)}
                      onViewChange={handleNavigate}
                      header
                    />
                  )}
                  {entry.items.map((item, i) => {
                    const isFirstMatch = entry.items.findIndex(it => it.view === item.view) === i
                    return (
                      <NavButton
                        key={item.id || `${item.view}-${i}`}
                        item={item}
                        active={activeView === item.view && isFirstMatch}
                        onViewChange={handleNavigate}
                        compact={!!item.id}
                      />
                    )
                  })}
                </div>
              )
            }
            return (
              <NavButton
                key={entry.view}
                item={entry}
                active={activeView === entry.view}
                onViewChange={handleNavigate}
              />
            )
          })}
        </nav>

        <div className="nav-bar-bottom">
          <NavButton
            item={{ view: 'settings', label: 'Settings', Icon: Settings }}
            active={activeView === 'settings'}
            onViewChange={handleNavigate}
          />
        </div>
      </div>

      <button className="nav-bar-collapse-btn" onClick={onToggleExpanded}>
        {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        <span className="nav-bar-label nav-bar-collapsible">{expanded ? 'Collapse' : ''}</span>
      </button>
    </aside>
  )
}

function NavButton({
  item,
  active,
  onViewChange,
  compact,
  header,
}: {
  item: NavItem
  active: boolean
  onViewChange: (view: View) => void
  compact?: boolean
  header?: boolean
}) {
  const cls = [
    'nav-bar-btn',
    active && 'active',
    compact && 'nav-bar-btn--compact',
    header && 'nav-bar-btn--header',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={cls} onClick={() => onViewChange(item.view)}>
      <item.Icon size={compact ? 16 : 18} />
      <span className="nav-bar-label nav-bar-collapsible">{item.label}</span>
    </button>
  )
}

export default AppNavBar
