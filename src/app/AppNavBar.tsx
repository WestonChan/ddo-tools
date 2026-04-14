import {
  Swords,
  ShieldHalf,
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
} from 'lucide-react'
import type { View } from '../hooks'
import { NavBarCharacterCard } from './NavBarCharacterCard'
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

        <NavBarCharacterCard activeView={activeView} onNavigate={handleNavigate} />

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
                  {/* Precompute first index per view so the active-state lookup is O(1)
                      inside the map instead of O(n²). Several sub-items share the same
                      view (e.g., build-plan sub-sections); only the first one lights up. */}
                  {(() => {
                    const firstIndexByView = new Map<View, number>()
                    entry.items.forEach((it, i) => {
                      if (!firstIndexByView.has(it.view)) firstIndexByView.set(it.view, i)
                    })
                    return entry.items.map((item, i) => {
                      const isFirstMatch = firstIndexByView.get(item.view) === i
                      return (
                        <NavButton
                          key={item.id || `${item.view}-${i}`}
                          item={item}
                          active={activeView === item.view && isFirstMatch}
                          onViewChange={handleNavigate}
                          compact={!!item.id}
                        />
                      )
                    })
                  })()}
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
