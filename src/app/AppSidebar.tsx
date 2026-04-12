import { useRef } from 'react'
import {
  Swords,
  ShieldHalf,
  User,
  ChevronRight,
  ChevronLeft,
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
  Columns2,
} from 'lucide-react'
import { TooltipWrapper } from '../components'
import {
  useCharacter,
  formatClassSummary,
  formatRace,
} from '../features/character'
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

type SidebarEntry = NavItem | NavGroup | 'divider'

function isGroup(entry: SidebarEntry): entry is NavGroup {
  return typeof entry === 'object' && 'items' in entry
}

function isDivider(entry: SidebarEntry): entry is 'divider' {
  return entry === 'divider'
}

function SkillsIcon(props: { size?: number }) {
  return <TableProperties {...props} style={{ transform: 'scaleX(-1)' }} />
}

const OVERVIEW_ITEM: NavItem = { view: 'overview', label: 'Build Overview', Icon: Swords }

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
    ],
  },
  'divider',
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
  const { character: selected, activeBuild } = useCharacter()

  function groupContainsActive(group: NavGroup): boolean {
    return group.items.some((item) => item.view === activeView)
  }

  const buildLabel = activeBuild
    ? `${selected.name}: ${formatRace(activeBuild.race)} ${formatClassSummary(activeBuild)}`
    : selected.name

  return (
    <div className={`sidebar-wrapper${expanded ? ' expanded' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggleExpanded}
        title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <aside className={`app-sidebar${expanded ? ' expanded' : ''}`}>
        {/* Site name / brand */}
        <div className="sidebar-brand">
          {expanded && <span className="sidebar-brand-text">DDO Builder</span>}
        </div>

        {/* Build Overview */}
        <NavButton
          item={OVERVIEW_ITEM}
          active={activeView === 'overview'}
          expanded={expanded}
          nested={false}
          onViewChange={onViewChange}
        />

        {/* Main navigation */}
        <nav className="sidebar-nav">
          {MAIN_NAV.map((entry, i) => {
            if (isDivider(entry)) {
              return <div key={`divider-${i}`} className="sidebar-group-divider" />
            }
            if (isGroup(entry)) {
              const hasActive = groupContainsActive(entry)
              return (
                <div key={entry.id} className="sidebar-group">
                  {expanded ? (
                    <span className={`sidebar-group-label${hasActive ? ' has-active' : ''}`}>
                      {entry.label}
                    </span>
                  ) : (
                    <div className="sidebar-group-divider" />
                  )}
                  {entry.items.map((item) => (
                    <NavButton
                      key={item.id || item.view}
                      item={item}
                      active={activeView === item.view}
                      expanded={expanded}
                      nested={expanded}
                      onViewChange={onViewChange}
                    />
                  ))}
                </div>
              )
            }
            return (
              <NavButton
                key={entry.view}
                item={entry}
                active={activeView === entry.view}
                expanded={expanded}
                nested={false}
                onViewChange={onViewChange}
              />
            )
          })}
        </nav>

        {/* Bottom section: settings, then build info */}
        <div className="sidebar-bottom">
          <div className="sidebar-bottom-divider" />

          <NavButton
            item={{ view: 'settings', label: 'Settings', Icon: Settings }}
            active={activeView === 'settings'}
            expanded={expanded}
            nested={false}
            onViewChange={onViewChange}
          />

          {/* Build / character info (very bottom) */}
          {expanded ? (
            <div
              className={`sidebar-build-row${activeView === 'characters' ? ' active' : ''}`}
              onClick={() => onViewChange('characters')}
            >
              <div className="sidebar-build-top-line">
                <User size={18} />
                <span className="sidebar-build-name">{selected.name}</span>
                <TooltipWrapper text="Compare builds (coming soon)" placement="right">
                  <button className="sidebar-compare-btn" disabled onClick={(e) => e.stopPropagation()}>
                    <Columns2 size={14} />
                  </button>
                </TooltipWrapper>
              </div>
              {activeBuild && (
                <div className="sidebar-build-detail">
                  {formatRace(activeBuild.race)} {formatClassSummary(activeBuild)}
                </div>
              )}
            </div>
          ) : (
            <TooltipWrapper text={buildLabel} placement="right">
              <div
                className={`sidebar-build-row${activeView === 'characters' ? ' active' : ''}`}
                onClick={() => onViewChange('characters')}
              >
                <User size={18} />
              </div>
            </TooltipWrapper>
          )}
        </div>
      </aside>
    </div>
  )
}

function NavButton({
  item,
  active,
  expanded,
  nested,
  onViewChange,
  className,
}: {
  item: NavItem
  active: boolean
  expanded: boolean
  nested: boolean
  onViewChange: (view: View) => void
  className?: string
}) {
  const btnRef = useRef<HTMLButtonElement>(null)

  const classes = [
    'sidebar-nav-btn',
    active && 'active',
    nested && 'nested',
    className,
  ].filter(Boolean).join(' ')

  const button = (
    <button
      ref={btnRef}
      className={classes}
      onClick={() => onViewChange(item.view)}
    >
      <item.Icon size={18} />
      {expanded && <span className="sidebar-nav-label">{item.label}</span>}
    </button>
  )

  if (expanded) return button

  return (
    <TooltipWrapper text={item.label} placement="right">
      {button}
    </TooltipWrapper>
  )
}

export default AppSidebar
