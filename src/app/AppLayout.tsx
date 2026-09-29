import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { Outlet, useLocation, useMatches } from '@tanstack/react-router'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import AppNavBar from './AppNavBar'
import { BottomBar, type BuildWarning } from './BottomBar'
import { ErrorCard, ErrorScreen } from '../components'
import { useIsAnyModalActive, useAccentColoredFavicon, useLocalStorage, useMediaQuery } from '../hooks'
import { captureBoundaryError } from '../lib/sentry'
import { BuildSidePanel } from '../features/character'
import './App.css'

const buildWarnings: BuildWarning[] = []

const ViewCrashScreen = (props: FallbackProps): JSX.Element => (
  <ErrorScreen
    {...props}
    heading="This view crashed"
    issueLabels="runtime"
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

const BottomBarCrashCard = (props: FallbackProps): JSX.Element => (
  <ErrorCard {...props} issueTitle="bottom-bar" issueLabels="runtime" />
)

function AppLayout(): JSX.Element {
  useAccentColoredFavicon()
  const [prefersExpandedNavBar, setPrefersExpandedNavBar] = useLocalStorage('ddo-nav-bar-expanded', true)
  const [isNavBarExpanded, setIsNavBarExpanded] = useState(() => {
    const width = window.innerWidth
    if (width < 900) return false
    return prefersExpandedNavBar
  })

  const previousWindowWidth = useRef(window.innerWidth)
  useEffect(() => {
    function syncNavBarToWindowWidth(): void {
      const width = window.innerWidth
      if (previousWindowWidth.current >= 900 && width < 900) {
        setIsNavBarExpanded(false)
      }
      if (previousWindowWidth.current < 900 && width >= 900) {
        setIsNavBarExpanded(prefersExpandedNavBar)
      }
      previousWindowWidth.current = width
    }
    window.addEventListener('resize', syncNavBarToWindowWidth)
    return () => window.removeEventListener('resize', syncNavBarToWindowWidth)
  }, [prefersExpandedNavBar])

  function toggleNavBar(): void {
    const next = !isNavBarExpanded
    setIsNavBarExpanded(next)
    setPrefersExpandedNavBar(next)
  }

  const collapseNavBar = useCallback((): void => {
    setIsNavBarExpanded(false)
    setPrefersExpandedNavBar(false)
  }, [setPrefersExpandedNavBar])

  const isMobileViewport = useMediaQuery('(max-width: 599px)')
  const isNavBarOverlayOpen = isNavBarExpanded && isMobileViewport

  const matches = useMatches()
  const hasBuildSidePanel = matches.some((m) => m.staticData.hasBuildSidePanel)
  const { pathname } = useLocation()

  const isAnyModalOpen = useIsAnyModalActive()
  const inertWhileModalOpen = isAnyModalOpen || undefined
  const inertWhileNavBarOverlayOpen = isNavBarOverlayOpen || undefined

  return (
    <div className="app-shell">
      <div className={`app${isNavBarExpanded ? '' : ' app--nav-bar-collapsed'}${hasBuildSidePanel ? '' : ' app--no-stats'}`}>
        <AppNavBar
          isExpanded={isNavBarExpanded}
          onToggleExpanded={toggleNavBar}
          onCollapse={collapseNavBar}
          isFullscreenOverlay={isNavBarOverlayOpen}
          inert={inertWhileModalOpen}
        />

        <div className="app-content" inert={inertWhileNavBarOverlayOpen}>
          <ErrorBoundary
            FallbackComponent={ViewCrashScreen}
            onError={captureBoundaryError}
            resetKeys={[pathname]}
          >
            <Outlet />
          </ErrorBoundary>
        </div>

        {hasBuildSidePanel && <BuildSidePanel inert={inertWhileNavBarOverlayOpen} />}
      </div>

      <ErrorBoundary FallbackComponent={BottomBarCrashCard} onError={captureBoundaryError}>
        <BottomBar warnings={buildWarnings} inert={inertWhileModalOpen || inertWhileNavBarOverlayOpen} />
      </ErrorBoundary>
    </div>
  )
}

export default AppLayout
