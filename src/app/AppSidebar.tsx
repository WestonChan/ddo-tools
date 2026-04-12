import {
  Swords,
  ShieldHalf,
  User,
  Settings,
  Scroll,
  TableProperties,
  Sparkles,
  GitBranch,
  Skull,
  Orbit,
  Calculator,
  ListChecks,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useCharacter } from '../features/character'
import type { View } from '../hooks'
import './AppSidebar.css'

// --- Navigation structure ---

interface NavItem {
  id?: string
  view: View
  label: string
  Icon: React.FC<{ size?: number }>
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

type SidebarEntry = NavItem | NavGroup

function isGroup(entry: SidebarEntry): entry is NavGroup {
  return typeof entry === 'object' && 'items' in entry
}

function SkillsIcon(props: { size?: number }) {
  return <TableProperties {...props} style={{ transform: 'scaleX(-1)' }} />
}

const MAIN_NAV: SidebarEntry[] = [
  {
    id: 'build-plan',
    label: 'Build Plan',
    items: [
      { id: 'levels', view: 'build-plan', label: 'Level Plan', Icon: Scroll },
      { id: 'skills', view: 'build-plan', label: 'Skills', Icon: SkillsIcon },
      { id: 'spells', view: 'build-plan', label: 'Spells', Icon: Sparkles },
      { id: 'enhancements', view: 'build-plan', label: 'Enhancements', Icon: GitBranch },
      { id: 'reaper', view: 'build-plan', label: 'Reaper', Icon: Skull },
      { id: 'destinies', view: 'build-plan', label: 'Destinies', Icon: Orbit },
      { view: 'gear', label: 'Gear', Icon: ShieldHalf },
      { view: 'overview', label: 'Build Overview', Icon: Swords },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { view: 'damage-calc', label: 'Damage Calc', Icon: Calculator },
      { view: 'farm-checklist', label: 'Farm Checklist', Icon: ListChecks },
      { view: 'debug', label: 'Debug', Icon: Search },
    ],
  },
]

// --- Component ---

interface AppSidebarProps {
  activeView: View
  onViewChange: (view: View) => void
  expanded: boolean
  onToggleExpanded: () => void
}

function AppSidebar({ activeView, onViewChange, expanded, onToggleExpanded }: AppSidebarProps) {
  const { character: selected } = useCharacter()

  function groupContainsActive(group: NavGroup): boolean {
    return group.items.some((item) => item.view === activeView)
  }

  // Close overlay sidebar on nav when at narrow widths
  function handleNavigate(view: View) {
    onViewChange(view)
    if (expanded && window.innerWidth <= 900) {
      onToggleExpanded()
    }
  }

  const sidebarContent = (forceExpanded?: boolean) => (
    <>
      <div className="sidebar-brand">
        <span className={`sidebar-brand-text${forceExpanded ? '' : ' sidebar-collapsible'}`}>DDO<br />Builder</span>
      </div>

      <nav className="sidebar-nav">
        {MAIN_NAV.map((entry) => {
          if (isGroup(entry)) {
            const hasActive = groupContainsActive(entry)
            return (
              <div key={entry.id} className="sidebar-group">
                <span className={`sidebar-group-label${hasActive ? ' has-active' : ''}`}>
                  <span className={`sidebar-group-label-text${forceExpanded ? '' : ' sidebar-collapsible'}`}>{entry.label}</span>
                </span>
                {entry.items.map((item, i) => {
                  const isFirstMatch = entry.items.findIndex(it => it.view === item.view) === i
                  return (
                    <NavButton
                      key={item.id || `${item.view}-${i}`}
                      item={item}
                      active={activeView === item.view && isFirstMatch}
                      onViewChange={handleNavigate}
                      forceExpanded={forceExpanded}
                    />
                  )
                })}
              </div>
            )
          }
          return (
            <NavButton
              key={entry.view}
              item={entry}
              active={activeView === entry.view}
              onViewChange={handleNavigate}
              forceExpanded={forceExpanded}
            />
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-bottom-divider" />
        <NavButton
          item={{ view: 'settings', label: 'Settings', Icon: Settings }}
          active={activeView === 'settings'}
          onViewChange={handleNavigate}
          forceExpanded={forceExpanded}
        />
        <div
          className={`sidebar-build-row${activeView === 'characters' ? ' active' : ''}`}
          onClick={() => handleNavigate('characters')}
        >
          <User size={18} />
          <span className={`sidebar-nav-label${forceExpanded ? '' : ' sidebar-collapsible'}`}>{selected.name}</span>
        </div>
        <button className="sidebar-collapse-btn" onClick={onToggleExpanded}>
          {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          <span className={`sidebar-nav-label${forceExpanded ? '' : ' sidebar-collapsible'}`}>{expanded ? 'Collapse' : ''}</span>
        </button>
      </div>
    </>
  )

  return (
    <>
    {/* Grid sidebar (always rendered, collapsed at narrow widths) */}
    <aside className={`app-sidebar${expanded ? ' expanded' : ''}`}>
      {sidebarContent()}
    </aside>

    {/* Overlay copy (only at narrow widths when expanded) */}
    {expanded && (
      <>
        <div className="sidebar-backdrop" onClick={onToggleExpanded} />
        <aside className="sidebar-overlay">
          {sidebarContent(true)}
        </aside>
      </>
    )}
    </>
  )
}

function NavButton({
  item,
  active,
  onViewChange,
  forceExpanded,
}: {
  item: NavItem
  active: boolean
  onViewChange: (view: View) => void
  forceExpanded?: boolean
}) {
  return (
    <button
      className={`sidebar-nav-btn${active ? ' active' : ''}`}
      onClick={() => onViewChange(item.view)}
    >
      <item.Icon size={18} />
      <span className={`sidebar-nav-label${forceExpanded ? '' : ' sidebar-collapsible'}`}>{item.label}</span>
    </button>
  )
}

export default AppSidebar
