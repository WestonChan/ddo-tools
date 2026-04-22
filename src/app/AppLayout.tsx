import { useEffect, useRef, useState, type JSX } from 'react'
import { Outlet, useMatches } from '@tanstack/react-router'
import AppNavBar from './AppNavBar'
import { BottomBar, type BuildWarning } from './BottomBar'
import { useLocalStorage } from '../hooks'
import { BuildSidePanel } from '../features/character'
import './App.css'

// Placeholder: no warnings until validation engine lands.
const warnings: BuildWarning[] = []

function AppLayout(): JSX.Element {
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

  return (
    <div className="app-shell">
      <div className={`app${navBarExpanded ? '' : ' app--nav-bar-collapsed'}${showRightPanel ? '' : ' app--no-stats'}`}>
        <AppNavBar expanded={navBarExpanded} onToggleExpanded={toggleNavBar} />

        <div className="app-content">
          <Outlet />
        </div>

        {showRightPanel && <BuildSidePanel />}
      </div>

      <BottomBar warnings={warnings} />
    </div>
  )
}

export default AppLayout
