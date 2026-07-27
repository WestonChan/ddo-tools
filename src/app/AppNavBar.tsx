import { useRef, type JSX } from 'react'
import { Link, useMatchRoute } from '@tanstack/react-router'
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
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  NotepadText,
} from 'lucide-react'
import { NavBarCharacterCard } from './NavBarCharacterCard'
import { AmpersandMark } from '../components'
import { useModalBehavior } from '../hooks'
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
      { to: '/resources', label: 'Resources', Icon: Library },
    ],
  },
]

// --- Component ---

interface AppNavBarProps {
  expanded: boolean
  onToggleExpanded: () => void
  /** Collapses the nav bar (persisting the collapsed preference). Used for
   *  every dismissal of the mobile fullscreen overlay — Escape and
   *  navigation — where a toggle would be wrong: dismissing must never
   *  expand. */
  onCollapse: () => void
  /** When `true`, the expanded nav bar is covering the viewport as the
   *  narrow-width fullscreen overlay, so it behaves like a modal: Escape
   *  dismisses it, focus moves in and is trapped, and navigating closes it.
   *  AppLayout owns the breakpoint check and inerts everything behind it. */
  overlayActive?: boolean
  /** When `true`, the entire nav bar becomes non-interactive — focus,
   *  pointer, and keyboard events are suppressed. Set by AppLayout while
   *  any modal-shape overlay (resources drawer, etc.) is active. */
  inert?: boolean
}

function AppNavBar({
  expanded,
  onToggleExpanded,
  onCollapse,
  overlayActive,
  inert,
}: AppNavBarProps): JSX.Element {
  const asideRef = useRef<HTMLElement | null>(null)

  // Modal behavior for the fullscreen overlay state (Escape to dismiss,
  // focus moved in and trapped). Two deliberate departures from <Modal>:
  //
  // - `registerActive: false`. The refcounted modal-active store exists so
  //   AppLayout can inert the background *chrome* — and this overlay IS
  //   chrome, so registering would inert the nav bar itself. AppLayout wires
  //   the surrounding regions from the same `overlayActive` flag instead.
  // - No `role="dialog"`. The nav bar stays a landmark <aside> wrapping a
  //   <nav>; dialog would flatten that structure for AT. `inert` on
  //   everything else is a stronger containment guarantee than aria-modal.
  useModalBehavior({
    active: !!overlayActive,
    onClose: onCollapse,
    panelRef: asideRef,
    registerActive: false,
  })

  // Test swap: useMatchRoute instead of useLocation-pathname equality.
  // Upside: handles nested/param routes (e.g., a child path under /settings
  // would still highlight the Settings nav item). Trade-off the original
  // author flagged: useMatchRoute reads against the pending route tree, so
  // during async `beforeLoad` redirects the matched route may lag the URL
  // by a frame. Revert to `useLocation().pathname === '/settings'` if the
  // mis-highlight is visible during transitions.
  const matchRoute = useMatchRoute()
  const settingsActive = !!matchRoute({ to: '/settings' })

  // The fullscreen overlay covers the view it just navigated to, so dismiss
  // it on navigate. Inline (wider) layouts stay put.
  function handleNavClick(): void {
    if (overlayActive) {
      onCollapse()
    }
  }

  return (
    <aside
      ref={asideRef}
      tabIndex={-1}
      className={`app-nav-bar${expanded ? ' expanded' : ''}`}
      inert={inert}
    >
      <div className="nav-bar-scroll">
        <Link
          to="/"
          className="nav-bar-brand hoverable"
          activeOptions={{ exact: true }}
          activeProps={{ className: 'nav-bar-brand hoverable active' }}
          onClick={handleNavClick}
        >
          <AmpersandMark className="nav-bar-brand-mark" size={26} />
          <span className="nav-bar-brand-text nav-bar-collapsible">DDO<br />Tools</span>
        </Link>

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
  // `fuzzy: true` so nested paths still light up the parent (e.g.
  // `/resources/items/123` highlights the Resources nav item, not just the
  // exact `/resources` URL). With strict equality (the previous approach),
  // any deep navigation would un-highlight the corresponding nav button.
  const matchRoute = useMatchRoute()
  const matchesTo = (to: string): boolean => !!matchRoute({ to, fuzzy: true })
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
