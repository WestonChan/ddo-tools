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

const warnings: BuildWarning[] = []

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

const BottomBarFallback = (props: FallbackProps): JSX.Element => (
  <ErrorCard {...props} context="bottom-bar" labels="runtime" />
)

function AppLayout(): JSX.Element {
  useFaviconAccent()
  const [storedExpanded, setStoredExpanded] = useLocalStorage('ddo-nav-bar-expanded', true)
  const [navBarExpanded, setNavBarExpanded] = useState(() => {
    const width = window.innerWidth
    if (width < 900) return false
    return storedExpanded
  })

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

  const collapseNavBar = useCallback((): void => {
    setNavBarExpanded(false)
    setStoredExpanded(false)
  }, [setStoredExpanded])

  const isMobileNav = useMediaQuery('(max-width: 599px)')
  const navOverlayActive = navBarExpanded && isMobileNav

  const matches = useMatches()
  const showRightPanel = matches.some((m) => m.staticData.showStatsPanel)
  const { pathname } = useLocation()

  const modalActive = useAnyModalActive()
  const inertProp = modalActive || undefined
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

      <ErrorBoundary FallbackComponent={BottomBarFallback} onError={captureBoundary}>
        <BottomBar warnings={warnings} inert={inertProp || navOverlayInert} />
      </ErrorBoundary>
    </div>
  )
}

export default AppLayout
