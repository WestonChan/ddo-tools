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
import { useModalAccessibility } from '../hooks'
import './AppNavBar.css'

interface NavBarLink {
  sectionId?: string
  to: string
  label: string
  Icon: React.FC<{ size?: number }>
}

interface NavBarGroup {
  id: string
  label: string
  to?: string
  Icon?: React.FC<{ size?: number }>
  links: NavBarLink[]
}

function SkillsIcon(props: { size?: number }): JSX.Element {
  return <TableProperties {...props} style={{ transform: 'scaleX(-1)' }} />
}

const NAV_BAR_GROUPS: NavBarGroup[] = [
  {
    id: 'build-plan',
    label: 'Build Plan',
    to: '/build-plan',
    Icon: NotepadText,
    links: [
      { sectionId: 'levels', to: '/build-plan', label: 'Level Plan', Icon: ListOrdered },
      { sectionId: 'skills', to: '/build-plan', label: 'Skills', Icon: SkillsIcon },
      { sectionId: 'spells', to: '/build-plan', label: 'Spells', Icon: Sparkles },
      { sectionId: 'enhancements', to: '/build-plan', label: 'Enhancements', Icon: GitBranch },
      { sectionId: 'reaper', to: '/build-plan', label: 'Reaper', Icon: Skull },
      { sectionId: 'destinies', to: '/build-plan', label: 'Destinies', Icon: Orbit },
      { to: '/gear', label: 'Gear', Icon: ShieldHalf },
      { to: '/overview', label: 'Build Overview', Icon: Swords },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    links: [
      { to: '/damage-calc', label: 'Damage Calc', Icon: Calculator },
      { to: '/farm-checklist', label: 'Farm Checklist', Icon: ListTodo },
      { to: '/resources', label: 'Resources', Icon: Library },
    ],
  },
]

interface AppNavBarProps {
  isExpanded: boolean
  onToggleExpanded: () => void
  onCollapse: () => void
  isFullscreenOverlay?: boolean
  inert?: boolean
}

function AppNavBar({
  isExpanded,
  onToggleExpanded,
  onCollapse,
  isFullscreenOverlay,
  inert,
}: AppNavBarProps): JSX.Element {
  const navBarRef = useRef<HTMLElement | null>(null)

  useModalAccessibility({
    isActive: !!isFullscreenOverlay,
    onClose: onCollapse,
    panelRef: navBarRef,
    shouldRegisterAsActiveModal: false,
  })

  const matchRoute = useMatchRoute()
  const isSettingsRouteActive = !!matchRoute({ to: '/settings' })

  function collapseIfFullscreenOverlay(): void {
    if (isFullscreenOverlay) {
      onCollapse()
    }
  }

  return (
    <aside
      ref={navBarRef}
      tabIndex={-1}
      className={`app-nav-bar${isExpanded ? ' expanded' : ''}`}
      inert={inert}
    >
      <div className="nav-bar-scroll">
        <Link
          to="/"
          className="nav-bar-brand hoverable"
          activeOptions={{ exact: true }}
          activeProps={{ className: 'nav-bar-brand hoverable active' }}
          onClick={collapseIfFullscreenOverlay}
        >
          <AmpersandMark className="nav-bar-brand-mark" size={26} />
          <span className="nav-bar-brand-text nav-bar-collapsible">
            DDO
            <br />
            Tools
          </span>
        </Link>

        <NavBarCharacterCard onNavigate={collapseIfFullscreenOverlay} />

        <nav className="nav-bar-items">
          {NAV_BAR_GROUPS.map((group) => (
            <NavBarGroupSection
              key={group.id}
              group={group}
              onNavigate={collapseIfFullscreenOverlay}
            />
          ))}
        </nav>

        <div className="nav-bar-bottom">
          <NavBarLinkButton
            link={{ to: '/settings', label: 'Settings', Icon: Settings }}
            isActive={isSettingsRouteActive}
            onNavigate={collapseIfFullscreenOverlay}
          />
        </div>
      </div>

      <button className="nav-bar-collapse-btn hoverable" onClick={onToggleExpanded}>
        {isExpanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        <span className="nav-bar-label nav-bar-collapsible">{isExpanded ? 'Collapse' : ''}</span>
      </button>
    </aside>
  )
}

function NavBarGroupSection({
  group,
  onNavigate,
}: {
  group: NavBarGroup
  onNavigate: () => void
}): JSX.Element {
  const matchRoute = useMatchRoute()
  const isPathActive = (to: string): boolean => !!matchRoute({ to, fuzzy: true })
  const hasActiveLink = group.links.some((item) => isPathActive(item.to))

  const firstLinkIndexByPath = new Map<string, number>()
  group.links.forEach((it, i) => {
    if (!firstLinkIndexByPath.has(it.to)) firstLinkIndexByPath.set(it.to, i)
  })

  return (
    <div className="nav-bar-group">
      <span className={`nav-bar-group-label${hasActiveLink ? ' has-active' : ''}`}>
        <span className="nav-bar-group-label-text nav-bar-collapsible">{group.label}</span>
      </span>
      {group.to && group.Icon && (
        <NavBarLinkButton
          link={{ to: group.to, label: group.label, Icon: group.Icon }}
          isActive={group.links.some((item) => item.sectionId && isPathActive(item.to))}
          onNavigate={onNavigate}
          isGroupHeader
        />
      )}
      {group.links.map((item, i) => (
        <NavBarLinkButton
          key={item.sectionId || `${item.to}-${i}`}
          link={item}
          isActive={isPathActive(item.to) && firstLinkIndexByPath.get(item.to) === i}
          onNavigate={onNavigate}
          isCompact={!!item.sectionId}
        />
      ))}
    </div>
  )
}

function NavBarLinkButton({
  link,
  isActive,
  onNavigate,
  isCompact,
  isGroupHeader,
}: {
  link: NavBarLink
  isActive: boolean
  onNavigate: () => void
  isCompact?: boolean
  isGroupHeader?: boolean
}): JSX.Element {
  const linkClassName = [
    'nav-bar-btn',
    'hoverable',
    isActive && 'active',
    isCompact && 'nav-bar-btn--compact',
    isGroupHeader && 'nav-bar-btn--header',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Link to={link.to} className={linkClassName} onClick={onNavigate} activeProps={{}}>
      <link.Icon size={isCompact ? 16 : 18} />
      <span className="nav-bar-label nav-bar-collapsible">{link.label}</span>
    </Link>
  )
}

export default AppNavBar
