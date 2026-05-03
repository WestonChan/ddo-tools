import { useEffect, useRef, useState, type JSX } from 'react'
import { Outlet, useLocation, useMatches } from '@tanstack/react-router'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import AppNavBar from './AppNavBar'
import { BottomBar, type BuildWarning } from './BottomBar'
import { ErrorCard, ErrorScreen } from '../components'
import { useFaviconAccent, useLocalStorage } from '../hooks'
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
    // 600-899: auto-collapse to icons. <600 and >=900: respect stored preference.
    if (width >= 600 && width < 900) return false
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

  const matches = useMatches()
  const showRightPanel = matches.some((m) => m.staticData.showStatsPanel)
  const { pathname } = useLocation()

  return (
    <div className="app-shell">
      <div className={`app${navBarExpanded ? '' : ' app--nav-bar-collapsed'}${showRightPanel ? '' : ' app--no-stats'}`}>
        <AppNavBar expanded={navBarExpanded} onToggleExpanded={toggleNavBar} />

        <div className="app-content">
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

        {showRightPanel && <BuildSidePanel />}
      </div>

      {/* Chrome boundary around BottomBar: the bar owns the static
          "Report a bug" button (the user's last resort), so a crash
          inside collapses to a compact ErrorCard rather than killing
          the whole bar. */}
      <ErrorBoundary FallbackComponent={BottomBarFallback} onError={captureBoundary}>
        <BottomBar warnings={warnings} />
      </ErrorBoundary>
    </div>
  )
}

export default AppLayout
