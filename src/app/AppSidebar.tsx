import {
  Swords,
  ShieldHalf,
  User,
  Settings,
  TableProperties,
  Sparkles,
  GitBranch,
  Skull,
  Orbit,
  Calculator,
  ListOrdered,
  ListTodo,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  NotepadText,
  GitCompareArrows,
} from 'lucide-react'
import { useCharacter, formatClassSummary, formatRace } from '../features/character'
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
  view?: View
  Icon?: React.FC<{ size?: number }>
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
    view: 'build-plan',
    Icon: NotepadText,
    items: [
      { id: 'levels', view: 'build-plan', label: 'Level Plan', Icon: ListOrdered },
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
      { view: 'farm-checklist', label: 'Farm Checklist', Icon: ListTodo },
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
  const { character: selected, activeBuild } = useCharacter()
  const raceLabel = activeBuild ? formatRace(activeBuild.race) : ''
  const classLabel = activeBuild ? formatClassSummary(activeBuild) : ''

  function groupContainsActive(group: NavGroup): boolean {
    return group.items.some((item) => item.view === activeView)
  }

  // At narrow widths the expanded sidebar is full-screen; auto-close on navigate
  function handleNavigate(view: View) {
    onViewChange(view)
    if (expanded && window.innerWidth < 600) {
      onToggleExpanded()
    }
  }

  return (
    <aside className={`app-sidebar${expanded ? ' expanded' : ''}`}>
      <div className="sidebar-scroll">
        <div className="sidebar-brand">
          <span className="sidebar-brand-text sidebar-collapsible">DDO<br />Builder</span>
        </div>

        <div
          className={`sidebar-character-card${activeView === 'characters' ? ' active' : ''}`}
          onClick={() => handleNavigate('characters')}
        >
          <div className="sidebar-character-header">
            <User size={18} />
            <span className="sidebar-character-name sidebar-collapsible">{selected.name}</span>
            <button
              className="sidebar-compare-btn sidebar-collapsible"
              title="Compare builds (coming soon)"
              onClick={(e) => e.stopPropagation()}
            >
              <GitCompareArrows size={14} />
            </button>
          </div>
          <div className="sidebar-character-details sidebar-collapsible">
            {raceLabel && <span className="sidebar-character-build">{raceLabel}</span>}
            {classLabel && <span className="sidebar-character-build">{classLabel}</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {MAIN_NAV.map((entry) => {
            if (isGroup(entry)) {
              const hasActive = groupContainsActive(entry)
              return (
                <div key={entry.id} className="sidebar-group">
                  <span className={`sidebar-group-label${hasActive ? ' has-active' : ''}`}>
                    <span className="sidebar-group-label-text sidebar-collapsible">{entry.label}</span>
                  </span>
                  {entry.view && entry.Icon && (
                    <NavButton
                      item={{ view: entry.view, label: entry.label, Icon: entry.Icon }}
                      active={entry.items.some((item) => item.id && item.view === activeView)}
                      onViewChange={handleNavigate}
                      header
                    />
                  )}
                  {entry.items.map((item, i) => {
                    const isFirstMatch = entry.items.findIndex(it => it.view === item.view) === i
                    return (
                      <NavButton
                        key={item.id || `${item.view}-${i}`}
                        item={item}
                        active={activeView === item.view && isFirstMatch}
                        onViewChange={handleNavigate}
                        compact={!!item.id}
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
              />
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <NavButton
            item={{ view: 'settings', label: 'Settings', Icon: Settings }}
            active={activeView === 'settings'}
            onViewChange={handleNavigate}
          />
        </div>
      </div>

      <button className="sidebar-collapse-btn" onClick={onToggleExpanded}>
        {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        <span className="sidebar-nav-label sidebar-collapsible">{expanded ? 'Collapse' : ''}</span>
      </button>
    </aside>
  )
}

function NavButton({
  item,
  active,
  onViewChange,
  compact,
  header,
}: {
  item: NavItem
  active: boolean
  onViewChange: (view: View) => void
  compact?: boolean
  header?: boolean
}) {
  const cls = [
    'sidebar-nav-btn',
    active && 'active',
    compact && 'sidebar-nav-btn--compact',
    header && 'sidebar-nav-btn--header',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={cls} onClick={() => onViewChange(item.view)}>
      <item.Icon size={compact ? 16 : 18} />
      <span className="sidebar-nav-label sidebar-collapsible">{item.label}</span>
    </button>
  )
}

export default AppSidebar
