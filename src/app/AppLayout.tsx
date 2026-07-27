import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { Outlet, useLocation, useMatches } from '@tanstack/react-router'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import AppNavBar from './AppNavBar'
import { BottomBar, type BuildWarning } from './BottomBar'
import { ErrorCard, ErrorScreen } from '../components'
import { useAnyModalActive, useFaviconAccent, useLocalStorage, useMediaQuery } from '../hooks'
import { captureBoundary } from '../lib/sentry'
import { BuildSidePanel } from '../features/character'
import './App.css'

// Placeholder: no warnings until validation engine lands.
const warnings: BuildWarning[] = []

// View-level fallback: full-screen ErrorScreen with a "Try again" action
// wired into the boundary's resetErrorBoundary via the actions render-prop.
const ViewFallback = (props: FallbackProps): JSX.Element => (
  <ErrorScreen
    {...props}
    heading="This view crashed"
    labels="runtime"
    actions={({ resetErrorBoundary }) => (
      <button
        type="button"
        className="btn-primary"
        onClick={resetErrorBoundary}
      >
        Try again
      </button>
    )}
  />
)

// Chrome-level fallback: compact ErrorCard sized to the BottomBar's
// horizontal slot. Owns the static "Report a bug" button, so a crash here
// must collapse to a card without taking down the rest of the shell.
const BottomBarFallback = (props: FallbackProps): JSX.Element => (
  <ErrorCard {...props} context="bottom-bar" labels="runtime" />
)

function AppLayout(): JSX.Element {
  useFaviconAccent()
  const [storedExpanded, setStoredExpanded] = useLocalStorage('ddo-nav-bar-expanded', true)
  const [navBarExpanded, setNavBarExpanded] = useState(() => {
    const width = window.innerWidth
    // Anything below 900px forces the nav bar collapsed on mount, regardless
    // of the user's stored preference. Symmetric with the resize listener
    // below (which auto-collapses on the same threshold) — without this
    // guard, a user who saved "expanded" on desktop would see an expanded
    // nav on every mobile/narrow-viewport load until they resized.
    if (width < 900) return false
    return storedExpanded
  })

  // Auto-collapse nav bar when viewport crosses below 900px,
  // restore stored preference when crossing back above 900px.
  const prevWidth = useRef(window.innerWidth)
  useEffect(() => {
    function handleResize(): void {
      const width = window.innerWidth
      if (prevWidth.current >= 900 && width < 900) {
        setNavBarExpanded(false)
      }
      if (prevWidth.current < 900 && width >= 900) {
        setNavBarExpanded(storedExpanded)
      }
      prevWidth.current = width
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [storedExpanded])

  function toggleNavBar(): void {
    const next = !navBarExpanded
    setNavBarExpanded(next)
    setStoredExpanded(next)
  }

  // Dismissing the mobile overlay persists the collapsed state, same as
  // hitting the collapse button — the user asked for it to be closed. That's
  // the opposite of the resize auto-collapse above, which deliberately leaves
  // the stored preference alone so the nav re-expands on the way back up.
  const collapseNavBar = useCallback((): void => {
    setNavBarExpanded(false)
    setStoredExpanded(false)
  }, [setStoredExpanded])

  // Below 600px the expanded nav bar is a fullscreen overlay rather than a
  // grid column — the breakpoint is duplicated from AppNavBar.css's single
  // `@media (max-width: 599px)` rule, so the two have to move together. In
  // that mode the nav bar behaves like a modal (AppNavBar wires Escape +
  // focus containment via useModalBehavior) and everything behind it goes
  // inert from here.
  const isMobileNav = useMediaQuery('(max-width: 599px)')
  const navOverlayActive = navBarExpanded && isMobileNav

  const matches = useMatches()
  const showRightPanel = matches.some((m) => m.staticData.showStatsPanel)
  const { pathname } = useLocation()

  // When any view registers a modal as active (resources detail drawer
  // today, future ConfirmModal / overlays), apply `inert` to the
  // surrounding nav bar + bottom bar so keyboard / focus / click events
  // can't reach them while the modal is on screen. See
  // src/hooks/useModalActive.ts for the refcounted store + docs/state-
  // management.md for the pattern. The modal itself stays interactive
  // because it's outside the inerted subtrees.
  const modalActive = useAnyModalActive()
  const inertProp = modalActive || undefined
  // Separate flag: the mobile nav overlay inerts everything except the nav bar
  // itself, so it can't share `inertProp` (which the nav bar consumes).
  const navOverlayInert = navOverlayActive || undefined

  return (
    <div className="app-shell">
      <div className={`app${navBarExpanded ? '' : ' app--nav-bar-collapsed'}${showRightPanel ? '' : ' app--no-stats'}`}>
        <AppNavBar
          expanded={navBarExpanded}
          onToggleExpanded={toggleNavBar}
          onCollapse={collapseNavBar}
          overlayActive={navOverlayActive}
          inert={inertProp}
        />

        <div className="app-content" inert={navOverlayInert}>
          {/* View-level boundary: a route-component crash collapses to an
              ErrorScreen here without taking down the surrounding chrome.
              resetKeys={[pathname]} auto-resets on route navigation. */}
          <ErrorBoundary
            FallbackComponent={ViewFallback}
            onError={captureBoundary}
            resetKeys={[pathname]}
          >
            <Outlet />
          </ErrorBoundary>
        </div>

        {showRightPanel && <BuildSidePanel inert={navOverlayInert} />}
      </div>

      {/* Chrome boundary around BottomBar: the bar owns the static
          "Report a bug" button (the user's last resort), so a crash
          inside collapses to a compact ErrorCard rather than killing
          the whole bar. */}
      <ErrorBoundary FallbackComponent={BottomBarFallback} onError={captureBoundary}>
        <BottomBar warnings={warnings} inert={inertProp || navOverlayInert} />
      </ErrorBoundary>
    </div>
  )
}

export default AppLayout
