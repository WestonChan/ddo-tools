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

interface NavGroupDef {
  id: string
  label: string
  view?: View
  Icon?: React.FC<{ size?: number }>
  items: NavItem[]
}

function SkillsIcon(props: { size?: number }) {
  return <TableProperties {...props} style={{ transform: 'scaleX(-1)' }} />
}

const MAIN_NAV: NavGroupDef[] = [
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
          {MAIN_NAV.map((group) => (
            <NavGroup
              key={group.id}
              group={group}
              activeView={activeView}
              onViewChange={handleNavigate}
            />
          ))}
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

function NavGroup({
  group,
  activeView,
  onViewChange,
}: {
  group: NavGroupDef
  activeView: View
  onViewChange: (view: View) => void
}) {
  const hasActive = group.items.some((item) => item.view === activeView)

  // Precompute first index per view so only the first sub-item per view lights up.
  // Several sub-items share the same view (e.g., build-plan sub-sections).
  const firstIndexByView = new Map<View, number>()
  group.items.forEach((it, i) => {
    if (!firstIndexByView.has(it.view)) firstIndexByView.set(it.view, i)
  })

  return (
    <div className="nav-bar-group">
      <span className={`nav-bar-group-label${hasActive ? ' has-active' : ''}`}>
        <span className="nav-bar-group-label-text nav-bar-collapsible">{group.label}</span>
      </span>
      {group.view && group.Icon && (
        <NavButton
          item={{ view: group.view, label: group.label, Icon: group.Icon }}
          active={group.items.some((item) => item.id && item.view === activeView)}
          onViewChange={onViewChange}
          header
        />
      )}
      {group.items.map((item, i) => (
        <NavButton
          key={item.id || `${item.view}-${i}`}
          item={item}
          active={activeView === item.view && firstIndexByView.get(item.view) === i}
          onViewChange={onViewChange}
          compact={!!item.id}
        />
      ))}
    </div>
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
