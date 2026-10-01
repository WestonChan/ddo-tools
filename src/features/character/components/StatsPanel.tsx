import { useId, useRef, useState, type JSX, type KeyboardEvent } from 'react'
import { DEFAULT_ACTIVE_BUFF_NAMES, DEFAULT_PINNED_STAT_GROUPS } from '../data/placeholderStats'
import type { PinnedStatGroup } from '../pinnedStatGroups'
import { BuffsTab } from './BuffsTab'
import { StatsTab } from './StatsTab'
import './StatsPanel.css'

type StatsPanelTab = 'stats' | 'buffs'

const TAB_LABELS: Record<StatsPanelTab, string> = {
  stats: 'Stats',
  buffs: 'Buffs',
}

const TABS = Object.keys(TAB_LABELS) as StatsPanelTab[]

function tabReachedByKey(activeTab: StatsPanelTab, key: string): StatsPanelTab | null {
  const activeIndex = TABS.indexOf(activeTab)
  if (key === 'ArrowRight') return TABS[(activeIndex + 1) % TABS.length]
  if (key === 'ArrowLeft') return TABS[(activeIndex - 1 + TABS.length) % TABS.length]
  if (key === 'Home') return TABS[0]
  if (key === 'End') return TABS[TABS.length - 1]
  return null
}

function namesWithNameToggled(names: ReadonlySet<string>, name: string): Set<string> {
  const toggledNames = new Set(names)
  if (toggledNames.has(name)) toggledNames.delete(name)
  else toggledNames.add(name)
  return toggledNames
}

export function StatsPanel(): JSX.Element {
  const idPrefix = useId()
  const [activeTab, setActiveTab] = useState<StatsPanelTab>('stats')
  const [pinnedGroups, setPinnedGroups] = useState<readonly PinnedStatGroup[]>(
    DEFAULT_PINNED_STAT_GROUPS,
  )
  const [expandedStatNames, setExpandedStatNames] = useState<ReadonlySet<string>>(new Set())
  const [activeBuffNames, setActiveBuffNames] = useState<ReadonlySet<string>>(
    () => new Set(DEFAULT_ACTIVE_BUFF_NAMES),
  )
  const [expandedBuffNames, setExpandedBuffNames] = useState<ReadonlySet<string>>(new Set())

  const tabId = (tab: StatsPanelTab): string => `${idPrefix}-${tab}-tab`
  const tabPanelId = `${idPrefix}-panel`
  const tabButtonsByTab = useRef(new Map<StatsPanelTab, HTMLButtonElement>())

  function activateTabReachedByKey(e: KeyboardEvent<HTMLDivElement>): void {
    const reachedTab = tabReachedByKey(activeTab, e.key)
    if (!reachedTab) return
    e.preventDefault()
    setActiveTab(reachedTab)
    tabButtonsByTab.current.get(reachedTab)?.focus()
  }

  return (
    <aside className="stats-panel" aria-label="Stats">
      <div
        className="segmented-control stats-panel-tabs"
        role="tablist"
        aria-label="Stats view"
        onKeyDown={activateTabReachedByKey}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            ref={(tabButton) => {
              if (tabButton) tabButtonsByTab.current.set(tab, tabButton)
              else tabButtonsByTab.current.delete(tab)
            }}
            id={tabId(tab)}
            type="button"
            role="tab"
            tabIndex={activeTab === tab ? 0 : -1}
            aria-selected={activeTab === tab}
            aria-controls={tabPanelId}
            className={`segmented-control-segment${activeTab === tab ? ' segmented-control-segment--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
            {tab === 'buffs' && (
              <>
                {' '}
                <span className="stats-panel-tab-count num">{activeBuffNames.size}</span>
              </>
            )}
          </button>
        ))}
      </div>

      <div id={tabPanelId} role="tabpanel" aria-labelledby={tabId(activeTab)}>
        {activeTab === 'stats' ? (
          <StatsTab
            pinnedGroups={pinnedGroups}
            setPinnedGroups={setPinnedGroups}
            focusStatsTab={() => tabButtonsByTab.current.get('stats')?.focus()}
            expandedStatNames={expandedStatNames}
            onToggleExpanded={(statName) =>
              setExpandedStatNames((names) => namesWithNameToggled(names, statName))
            }
          />
        ) : (
          <BuffsTab
            activeBuffNames={activeBuffNames}
            expandedBuffNames={expandedBuffNames}
            onToggleActive={(buffName) =>
              setActiveBuffNames((names) => namesWithNameToggled(names, buffName))
            }
            onToggleExpanded={(buffName) =>
              setExpandedBuffNames((names) => namesWithNameToggled(names, buffName))
            }
          />
        )}
      </div>
    </aside>
  )
}
