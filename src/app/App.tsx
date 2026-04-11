import AppSidebar from './AppSidebar'
import { useLocalStorage, useRouter } from '../hooks'
import {
  BuildSidePanel,
  CharacterView,
} from '../features/character'
import './App.css'

const VIEWS_WITH_STATS_PANEL = new Set(['overview', 'build-plan', 'gear'])

function App() {
  const { view, navigate } = useRouter()
  const [sidebarExpanded, setSidebarExpanded] = useLocalStorage('ddo-sidebar-expanded', false)

  const showRightPanel = VIEWS_WITH_STATS_PANEL.has(view)
  const appClasses = [
    'app',
    showRightPanel ? '' : 'app--no-sidebar',
    sidebarExpanded ? 'app--sidebar-expanded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={appClasses}>
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
        {view === 'settings' && (
          <div className="section-placeholder">Settings coming soon.</div>
        )}
      </div>
      {showRightPanel && <BuildSidePanel />}
    </div>
  )
}

export default App
