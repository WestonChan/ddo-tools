import AppSidebar from './AppSidebar'
import { SettingsView } from './SettingsView'
import { BottomBar } from './BottomBar'
import type { BuildWarning } from './BottomBar'
import { useLocalStorage, useRouter } from '../hooks'
import {
  BuildSidePanel,
  CharacterView,
} from '../features/character'
import './App.css'

// Placeholder: no warnings until validation engine is built
const warnings: BuildWarning[] = []

const VIEWS_WITH_STATS_PANEL = new Set(['build-plan'])

function App() {
  const { view, navigate } = useRouter()
  const [sidebarExpanded, setSidebarExpanded] = useLocalStorage('ddo-sidebar-expanded', true)

  const showRightPanel = VIEWS_WITH_STATS_PANEL.has(view)
  return (
    <div className="app-shell">
      <div className={`app${sidebarExpanded ? '' : ' app--sidebar-collapsed'}${showRightPanel ? '' : ' app--no-stats'}`}>
        <AppSidebar
          activeView={view}
          onViewChange={navigate}
          expanded={sidebarExpanded}
          onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
        />

        <div className="app-content">
          {view === 'characters' && <CharacterView />}
          {view === 'build-plan' && (
            <div className="section-placeholder">Build Plan coming in Phase 5.</div>
          )}
          {view === 'overview' && (
            <div className="section-placeholder">Build Overview coming in Phase 10.</div>
          )}
          {view === 'gear' && (
            <div className="section-placeholder">Gear Planner coming in Phase 6.</div>
          )}
          {view === 'damage-calc' && (
            <div className="section-placeholder">Damage Calculator coming in a future update.</div>
          )}
          {view === 'farm-checklist' && (
            <div className="section-placeholder">Farm Checklist coming in Phase 8.</div>
          )}
          {view === 'debug' && (
            <div className="section-placeholder">Debug / Data Browser coming in Phase 2.</div>
          )}
          {view === 'settings' && <SettingsView />}
        </div>

        {showRightPanel && <BuildSidePanel />}
      </div>

      <BottomBar warnings={warnings} onNavigate={navigate} />
    </div>
  )
}

export default App
