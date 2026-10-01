import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { Outlet, useLocation, useMatches } from '@tanstack/react-router'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import AppNavBar from './AppNavBar'
import type { BuildWarning } from './buildWarnings'
import { ErrorScreen } from '../components'
import {
  useIsAnyModalActive,
  useAccentColoredFavicon,
  useLocalStorage,
  useMediaQuery,
  useTheme,
} from '../hooks'
import { captureBoundaryError } from '../lib/sentry'
import { StatsPanel } from '../features/character'
import './App.css'

const buildWarnings: BuildWarning[] = []

const ViewCrashScreen = (props: FallbackProps): JSX.Element => (
  <ErrorScreen
    {...props}
    heading="This view crashed"
    issueLabels="runtime"
    actions={({ resetErrorBoundary }) => (
      <button type="button" className="btn-primary" onClick={resetErrorBoundary}>
        Try again
      </button>
    )}
  />
)

function AppLayout(): JSX.Element {
  useAccentColoredFavicon()
  useTheme()
  const [shouldExpandNavBar, setShouldExpandNavBar] = useLocalStorage('ddo-nav-bar-expanded', true)
  const [isNavBarExpanded, setIsNavBarExpanded] = useState(() => {
    const width = window.innerWidth
    if (width < 900) return false
    return shouldExpandNavBar
  })

  const previousWindowWidth = useRef(window.innerWidth)
  useEffect(() => {
    function syncNavBarToWindowWidth(): void {
      const width = window.innerWidth
      if (previousWindowWidth.current >= 900 && width < 900) {
        setIsNavBarExpanded(false)
      }
      if (previousWindowWidth.current < 900 && width >= 900) {
        setIsNavBarExpanded(shouldExpandNavBar)
      }
      previousWindowWidth.current = width
    }
    window.addEventListener('resize', syncNavBarToWindowWidth)
    return () => window.removeEventListener('resize', syncNavBarToWindowWidth)
  }, [shouldExpandNavBar])

  function toggleNavBar(): void {
    const willBeExpanded = !isNavBarExpanded
    setIsNavBarExpanded(willBeExpanded)
    setShouldExpandNavBar(willBeExpanded)
  }

  const collapseNavBar = useCallback((): void => {
    setIsNavBarExpanded(false)
    setShouldExpandNavBar(false)
  }, [setShouldExpandNavBar])

  const isMobileViewport = useMediaQuery('(max-width: 599px)')
  const isNavBarOverlayOpen = isNavBarExpanded && isMobileViewport

  const isBelowStatsPanelWidth = useMediaQuery('(max-width: 899px)')
  const matches = useMatches()
  const isStatsPanelRoute = matches.some((match) => match.staticData.shouldShowStatsPanel)
  const shouldShowStatsPanel = isStatsPanelRoute && !isBelowStatsPanelWidth
  const { pathname } = useLocation()

  const isAnyModalOpen = useIsAnyModalActive()
  const isInertBehindModal = isAnyModalOpen || undefined
  const isInertBehindNavBarOverlay = isNavBarOverlayOpen || undefined

  return (
    <div className="app-shell">
      <div
        className={`app${isNavBarExpanded ? '' : ' app--nav-bar-collapsed'}${shouldShowStatsPanel ? '' : ' app--no-stats'}`}
      >
        <AppNavBar
          isExpanded={isNavBarExpanded}
          onToggleExpanded={toggleNavBar}
          onCollapse={collapseNavBar}
          warnings={buildWarnings}
          isFullscreenOverlay={isNavBarOverlayOpen}
          inert={isInertBehindModal}
        />

        <div className="app-content" inert={isInertBehindNavBarOverlay}>
          <ErrorBoundary
            FallbackComponent={ViewCrashScreen}
            onError={captureBoundaryError}
            resetKeys={[pathname]}
          >
            <Outlet />
          </ErrorBoundary>
        </div>

        {shouldShowStatsPanel && <StatsPanel />}
      </div>
    </div>
  )
}

export default AppLayout
