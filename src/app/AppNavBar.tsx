import type { JSX } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
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
import { NavBarCharacterCard } from './NavBarCharacterCard'
import './AppNavBar.css'

// --- Navigation structure ---

interface NavItem {
  id?: string
  to: string
  label: string
  Icon: React.FC<{ size?: number }>
}

interface NavGroupDef {
  id: string
  label: string
  to?: string
  Icon?: React.FC<{ size?: number }>
  items: NavItem[]
}

function SkillsIcon(props: { size?: number }): JSX.Element {
  return <TableProperties {...props} style={{ transform: 'scaleX(-1)' }} />
}

const MAIN_NAV: NavGroupDef[] = [
  {
    id: 'build-plan',
    label: 'Build Plan',
    to: '/build-plan',
    Icon: NotepadText,
    items: [
      { id: 'levels', to: '/build-plan', label: 'Level Plan', Icon: ListOrdered },
      { id: 'skills', to: '/build-plan', label: 'Skills', Icon: SkillsIcon },
      { id: 'spells', to: '/build-plan', label: 'Spells', Icon: Sparkles },
      { id: 'enhancements', to: '/build-plan', label: 'Enhancements', Icon: GitBranch },
      { id: 'reaper', to: '/build-plan', label: 'Reaper', Icon: Skull },
      { id: 'destinies', to: '/build-plan', label: 'Destinies', Icon: Orbit },
      { to: '/gear', label: 'Gear', Icon: ShieldHalf },
      { to: '/overview', label: 'Build Overview', Icon: Swords },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { to: '/damage-calc', label: 'Damage Calc', Icon: Calculator },
      { to: '/farm-checklist', label: 'Farm Checklist', Icon: ListTodo },
      { to: '/debug', label: 'Debug', Icon: Search },
    ],
  },
]

// --- Component ---

interface AppNavBarProps {
  expanded: boolean
  onToggleExpanded: () => void
}

function AppNavBar({ expanded, onToggleExpanded }: AppNavBarProps): JSX.Element {
  // useLocation reads the committed location; useMatchRoute reads pending, which lags after beforeLoad redirects.
  const settingsActive = useLocation().pathname === '/settings'

  // At narrow widths the expanded nav bar is full-screen; auto-close on navigate.
  function handleNavClick(): void {
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

        <NavBarCharacterCard onNavClick={handleNavClick} />

        <nav className="nav-bar-items">
          {MAIN_NAV.map((group) => (
            <NavGroup key={group.id} group={group} onNavClick={handleNavClick} />
          ))}
        </nav>

        <div className="nav-bar-bottom">
          <NavButton
            item={{ to: '/settings', label: 'Settings', Icon: Settings }}
            active={settingsActive}
            onNavClick={handleNavClick}
          />
        </div>
      </div>

      <button className="nav-bar-collapse-btn hoverable" onClick={onToggleExpanded}>
        {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        <span className="nav-bar-label nav-bar-collapsible">{expanded ? 'Collapse' : ''}</span>
      </button>
    </aside>
  )
}

function NavGroup({
  group,
  onNavClick,
}: {
  group: NavGroupDef
  onNavClick: () => void
}): JSX.Element {
  const { pathname } = useLocation()
  const matchesTo = (to: string): boolean => pathname === to
  const hasActive = group.items.some((item) => matchesTo(item.to))

  // Precompute first index per `to` so only the first sub-item per path lights up.
  // Several sub-items share the same path (e.g., build-plan sub-sections) — future
  // Phase 7 will give each its own scroll anchor; until then, highlight once.
  const firstIndexByTo = new Map<string, number>()
  group.items.forEach((it, i) => {
    if (!firstIndexByTo.has(it.to)) firstIndexByTo.set(it.to, i)
  })

  return (
    <div className="nav-bar-group">
      <span className={`nav-bar-group-label${hasActive ? ' has-active' : ''}`}>
        <span className="nav-bar-group-label-text nav-bar-collapsible">{group.label}</span>
      </span>
      {group.to && group.Icon && (
        <NavButton
          item={{ to: group.to, label: group.label, Icon: group.Icon }}
          active={group.items.some((item) => item.id && matchesTo(item.to))}
          onNavClick={onNavClick}
          header
        />
      )}
      {group.items.map((item, i) => (
        <NavButton
          key={item.id || `${item.to}-${i}`}
          item={item}
          active={matchesTo(item.to) && firstIndexByTo.get(item.to) === i}
          onNavClick={onNavClick}
          compact={!!item.id}
        />
      ))}
    </div>
  )
}

function NavButton({
  item,
  active,
  onNavClick,
  compact,
  header,
}: {
  item: NavItem
  active: boolean
  onNavClick: () => void
  compact?: boolean
  header?: boolean
}): JSX.Element {
  const cls = [
    'nav-bar-btn',
    'hoverable',
    active && 'active',
    compact && 'nav-bar-btn--compact',
    header && 'nav-bar-btn--header',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Link to={item.to} className={cls} onClick={onNavClick} activeProps={{}}>
      <item.Icon size={compact ? 16 : 18} />
      <span className="nav-bar-label nav-bar-collapsible">{item.label}</span>
    </Link>
  )
}

export default AppNavBar
