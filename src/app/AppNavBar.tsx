import { useCallback, useId, useRef, useState, type JSX, type ReactNode } from 'react'
import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import {
  Bug,
  Calculator,
  ExternalLink,
  Library,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  Shirt,
  Swords,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { AnchoredMenu, ErrorCard, GitHubMark } from '../components'
import { useModalAccessibility } from '../hooks'
import { githubIssueUrls, REPOSITORY_URL } from '../lib/githubIssue'
import { captureBoundaryError, lastSentryEventReference } from '../lib/sentry'
import { BUILD_PLAN_SECTIONS } from '../features/build'
import type { BuildWarning } from './buildWarnings'
import { NavBarCharacterCard } from './NavBarCharacterCard'
import './AppNavBar.css'

interface NavBarDestination {
  to: string
  label: string
  Icon: LucideIcon
}

const ROSTER_DESTINATIONS: NavBarDestination[] = [
  { to: '/characters', label: 'Characters & builds', Icon: Users },
]

const BUILD_OVERVIEW_DESTINATION: NavBarDestination = {
  to: '/overview',
  label: 'Build overview',
  Icon: Swords,
}
const BUILD_PLAN_DESTINATION: NavBarDestination = {
  to: '/build-plan',
  label: 'Build plan',
  Icon: ScrollText,
}
const GEAR_DESTINATION: NavBarDestination = { to: '/gear', label: 'Gear', Icon: Shirt }

const TOOL_DESTINATIONS: NavBarDestination[] = [
  { to: '/damage-calc', label: 'Damage calc', Icon: Calculator },
  { to: '/farm-checklist', label: 'Farm checklist', Icon: ListTodo },
  { to: '/resources', label: 'Resources', Icon: Library },
]

const SETTINGS_DESTINATION: NavBarDestination = {
  to: '/settings',
  label: 'Settings',
  Icon: Settings,
}

const WARNINGS_POPOVER_WIDTH_PX = 300

const CharacterCardCrashCard = (props: FallbackProps): JSX.Element => (
  <ErrorCard {...props} issueTitle="character-card" issueLabels="runtime" />
)

interface AppNavBarProps {
  isExpanded: boolean
  onToggleExpanded: () => void
  onCollapse: () => void
  warnings: BuildWarning[]
  isFullscreenOverlay?: boolean
  inert?: boolean
}

function openBugReportIssue(): void {
  const { newIssueUrl } = githubIssueUrls(undefined, [], 'User report', lastSentryEventReference())
  window.open(newIssueUrl, '_blank', 'noopener,noreferrer')
}

function AppNavBar({
  isExpanded,
  onToggleExpanded,
  onCollapse,
  warnings,
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
  const shouldShowBuildPlanSections = isExpanded && !!matchRoute({ to: '/build-plan' })

  function collapseIfFullscreenOverlay(): void {
    if (isFullscreenOverlay) onCollapse()
  }

  function destinationRow(destination: NavBarDestination): JSX.Element {
    return (
      <NavBarLinkRow
        key={destination.to}
        destination={destination}
        isExpanded={isExpanded}
        onNavigate={collapseIfFullscreenOverlay}
      />
    )
  }

  return (
    <aside
      ref={navBarRef}
      tabIndex={-1}
      className={`app-nav-bar${isExpanded ? ' expanded' : ''}`}
      inert={inert}
    >
      <Link
        to="/"
        className="nav-bar-brand"
        activeOptions={{ exact: true }}
        onClick={collapseIfFullscreenOverlay}
      >
        {isExpanded ? 'DDO TOOLS' : 'DT'}
      </Link>

      <ErrorBoundary FallbackComponent={CharacterCardCrashCard} onError={captureBoundaryError}>
        <NavBarCharacterCard isExpanded={isExpanded} />
      </ErrorBoundary>

      <nav className="nav-bar-groups" aria-label="Main">
        <NavBarGroup label="Roster">{ROSTER_DESTINATIONS.map(destinationRow)}</NavBarGroup>
        <NavBarGroup label="Build">
          {destinationRow(BUILD_OVERVIEW_DESTINATION)}
          {destinationRow(BUILD_PLAN_DESTINATION)}
          {shouldShowBuildPlanSections && (
            <div className="nav-bar-sections">
              {BUILD_PLAN_SECTIONS.map((section) => (
                <NavBarLinkRow
                  key={section.id}
                  destination={{ to: '/build-plan', label: section.label, Icon: section.Icon }}
                  hash={section.id}
                  isExpanded={isExpanded}
                  onNavigate={collapseIfFullscreenOverlay}
                />
              ))}
            </div>
          )}
          {destinationRow(GEAR_DESTINATION)}
        </NavBarGroup>
        <NavBarGroup label="Tools">{TOOL_DESTINATIONS.map(destinationRow)}</NavBarGroup>
      </nav>

      <div className="nav-bar-spacer" />

      <NavBarWarnings
        warnings={warnings}
        isExpanded={isExpanded}
        onNavigate={collapseIfFullscreenOverlay}
      />

      <button
        type="button"
        className="nav-bar-row nav-bar-row--faint nav-bar-collapse-btn"
        title={isExpanded ? undefined : 'Expand'}
        onClick={onToggleExpanded}
      >
        {isExpanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        <span className="nav-bar-label">{isExpanded ? 'Collapse' : 'Expand'}</span>
      </button>

      <div className="nav-bar-hairline" />

      {destinationRow(SETTINGS_DESTINATION)}
      <button
        type="button"
        className="nav-bar-row"
        title={isExpanded ? undefined : 'Report a bug'}
        onClick={openBugReportIssue}
      >
        <Bug size={16} />
        <span className="nav-bar-label">Report a bug</span>
      </button>
      <a
        className="nav-bar-row nav-bar-row--faint"
        href={REPOSITORY_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Source on GitHub · WestonChan/ddo-tools"
      >
        <GitHubMark size={16} />
        <span className="nav-bar-label">GitHub</span>
        {isExpanded && <ExternalLink size={12} className="nav-bar-external-glyph" />}
      </a>
    </aside>
  )
}

function NavBarGroup({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="nav-bar-group">
      <div className="nav-bar-group-label section-label">
        <span className="nav-bar-group-label-text">{label}</span>
      </div>
      {children}
    </div>
  )
}

function NavBarLinkRow({
  destination,
  hash,
  isExpanded,
  onNavigate,
}: {
  destination: NavBarDestination
  hash?: string
  isExpanded: boolean
  onNavigate: () => void
}): JSX.Element {
  const { to, label, Icon } = destination
  return (
    <Link
      to={to}
      hash={hash}
      activeOptions={hash ? { includeHash: true } : undefined}
      className={`nav-bar-row${hash ? ' nav-bar-row--section' : ''}`}
      title={isExpanded ? undefined : label}
      onClick={onNavigate}
    >
      <Icon size={16} />
      <span className="nav-bar-label">{label}</span>
    </Link>
  )
}

function NavBarWarnings({
  warnings,
  isExpanded,
  onNavigate,
}: {
  warnings: BuildWarning[]
  isExpanded: boolean
  onNavigate: () => void
}): JSX.Element {
  const navigate = useNavigate()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const popoverId = useId()
  const warningsRowRef = useRef<HTMLButtonElement | null>(null)
  const closePopover = useCallback((): void => setIsPopoverOpen(false), [])

  function goToWarning(warning: BuildWarning): void {
    closePopover()
    onNavigate()
    navigate({ to: warning.to })
  }

  return (
    <>
      <button
        ref={warningsRowRef}
        type="button"
        className={`nav-bar-row nav-bar-warnings-row${warnings.length === 0 ? ' nav-bar-warnings-row--empty' : ''}`}
        aria-expanded={isPopoverOpen}
        aria-controls={isPopoverOpen ? popoverId : undefined}
        title={isExpanded ? undefined : `Warnings: ${warnings.length}`}
        onClick={() => setIsPopoverOpen((wasOpen) => !wasOpen)}
      >
        <TriangleAlert size={16} />
        <span className="nav-bar-label">Warnings</span>
        <span className="nav-bar-warnings-count num">{warnings.length}</span>
      </button>
      {isPopoverOpen && (
        <AnchoredMenu
          id={popoverId}
          anchorRef={warningsRowRef}
          placement="above"
          widthPx={WARNINGS_POPOVER_WIDTH_PX}
          label="Build warnings"
          onClose={closePopover}
        >
          <div className="anchored-menu-eyebrow section-label">Build warnings</div>
          {warnings.length === 0 ? (
            <p className="nav-bar-warnings-empty">
              No warnings yet — build validation arrives with the stats engine.
            </p>
          ) : (
            warnings.map((warning) => (
              <button
                key={`${warning.to}-${warning.message}`}
                type="button"
                className="anchored-menu-row nav-bar-warning"
                onClick={() => goToWarning(warning)}
              >
                <TriangleAlert size={14} className="nav-bar-warning-icon" />
                <span className="nav-bar-warning-message">{warning.message}</span>
                <span className="nav-bar-warning-location">{warning.locationLabel}</span>
              </button>
            ))
          )}
        </AnchoredMenu>
      )}
    </>
  )
}

export default AppNavBar
