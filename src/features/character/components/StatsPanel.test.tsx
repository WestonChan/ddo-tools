import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StatsPanel } from './StatsPanel'
import {
  DEFAULT_ACTIVE_BUFF_NAMES,
  DEFAULT_PINNED_STAT_GROUPS,
  PLACEHOLDER_BUFF_GROUPS,
  PLACEHOLDER_STAT_GROUPS,
} from '../data/placeholderStats'

const ALL_STATS = PLACEHOLDER_STAT_GROUPS.flatMap((group) => group.stats)
const ALL_BUFFS = PLACEHOLDER_BUFF_GROUPS.flatMap((group) => group.buffs)
const DEFAULT_PINNED_STAT_NAMES = DEFAULT_PINNED_STAT_GROUPS.flatMap((group) => group.statNames)
const DEFAULT_STAT_NAMES_BY_GROUP_LABEL = Object.fromEntries(
  DEFAULT_PINNED_STAT_GROUPS.map((group) => [group.label, group.statNames]),
)

async function openTab(tabName: string | RegExp): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('tab', { name: tabName }))
  return screen.getByRole('tabpanel')
}

function pinnedSection(): HTMLElement {
  return screen.getByRole('region', { name: 'Pinned stats' })
}

function allStatsSection(): HTMLElement {
  return screen.getByRole('region', { name: 'All stats' })
}

function statNamesBehindButtons(container: HTMLElement, actionPattern: RegExp): string[] {
  return within(container)
    .queryAllByRole('button', { name: actionPattern })
    .map((button) => button.getAttribute('aria-label')!.replace(actionPattern, ''))
}

function pinnedStatNamesByGroupLabel(): Record<string, string[]> {
  return Object.fromEntries(
    within(pinnedSection())
      .queryAllByRole('group')
      .map((group) => [
        (within(group).getByRole('textbox', { name: 'Group name' }) as HTMLInputElement).value,
        statNamesBehindButtons(group, /^Unpin /),
      ]),
  )
}

function statNamesInAllStats(): string[] {
  return statNamesBehindButtons(allStatsSection(), /^Pin /)
}

function statRowToggleFor(container: HTMLElement, statName: string): HTMLElement {
  return within(container).getByRole('button', {
    name: (accessibleName) => accessibleName.startsWith(statName),
    expanded: false,
  })
}

const LAYOUT_BAND_HEIGHT_PX = 4
const LAYOUT_WIDTH_PX = 280

function documentOrderIndexOf(element: Element): number {
  return Math.max([...document.body.querySelectorAll('*')].indexOf(element), 0)
}

function mockBoundingRects(rectOf: (element: Element) => DOMRect): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const draggedRow = document.querySelector('[aria-pressed="true"]')?.closest('li')
    const isInDragOverlay = this.closest('.stats-panel-drag-overlay') !== null
    return rectOf(isInDragOverlay && draggedRow ? draggedRow : this)
  })
}

function layOutElementsInDocumentOrder(): void {
  mockBoundingRects((element) =>
    DOMRect.fromRect({
      x: 0,
      y: documentOrderIndexOf(element) * LAYOUT_BAND_HEIGHT_PX,
      width: LAYOUT_WIDTH_PX,
      height: LAYOUT_BAND_HEIGHT_PX,
    }),
  )
}

function layOutElementsAroundTheirDescendants(): void {
  mockBoundingRects((element) => {
    const descendants = element.querySelectorAll('*')
    const lastDescendant = descendants[descendants.length - 1]
    const firstBand = documentOrderIndexOf(element)
    const lastBand = lastDescendant ? documentOrderIndexOf(lastDescendant) : firstBand
    return DOMRect.fromRect({
      x: 0,
      y: firstBand * LAYOUT_BAND_HEIGHT_PX,
      width: LAYOUT_WIDTH_PX,
      height: (lastBand - firstBand + 1) * LAYOUT_BAND_HEIGHT_PX,
    })
  })
}

function pointInFirstBandOf(element: Element): { clientX: number; clientY: number } {
  return {
    clientX: LAYOUT_WIDTH_PX / 2,
    clientY: documentOrderIndexOf(element) * LAYOUT_BAND_HEIGHT_PX + LAYOUT_BAND_HEIGHT_PX / 2,
  }
}

function dragWithPointer(statName: string, releaseOver: () => Element): void {
  const grip = screen.getByRole('button', { name: `Move ${statName}` })
  const start = pointInFirstBandOf(grip)
  fireEvent.pointerDown(grip, { ...start, isPrimary: true, button: 0 })
  act(() => {
    fireEvent.pointerMove(document, { clientX: start.clientX + 10, clientY: start.clientY })
  })
  const release = pointInFirstBandOf(releaseOver())
  act(() => {
    fireEvent.pointerMove(document, release)
  })
  act(() => {
    fireEvent.pointerUp(document, release)
  })
}

function pinnedGroupElement(label: string): HTMLElement {
  return within(pinnedSection()).getByRole('group', { name: label })
}

describe('StatsPanel', () => {
  it('opens on the Stats tab and switches to Buffs and back', async () => {
    render(<StatsPanel />)
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Stats')
    expect(pinnedSection()).toBeInTheDocument()
    for (const group of PLACEHOLDER_STAT_GROUPS) {
      expect(within(allStatsSection()).getByRole('heading', { name: group.name })).toBeVisible()
    }

    const buffsPanel = await openTab(/^Buffs/)
    for (const group of PLACEHOLDER_BUFF_GROUPS) {
      expect(within(buffsPanel).getByRole('heading', { name: group.name })).toBeInTheDocument()
    }
    expect(within(buffsPanel).getByText('Toggles recompute every stat above.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Pinned stats' })).not.toBeInTheDocument()

    await openTab('Stats')
    expect(pinnedSection()).toBeInTheDocument()
  })

  it('pins only stats the All stats catalog lists, each in one default group', () => {
    const catalogStatNames = new Set(ALL_STATS.map((stat) => stat.name))
    expect(DEFAULT_PINNED_STAT_NAMES.filter((name) => !catalogStatNames.has(name))).toEqual([])
    expect(new Set(DEFAULT_PINNED_STAT_NAMES).size).toBe(DEFAULT_PINNED_STAT_NAMES.length)
  })

  it('renders the default pinned groups under their labels and lists every other stat once in All stats', () => {
    render(<StatsPanel />)
    expect(pinnedStatNamesByGroupLabel()).toEqual(DEFAULT_STAT_NAMES_BY_GROUP_LABEL)
    expect(statNamesInAllStats()).toEqual(
      ALL_STATS.map((stat) => stat.name).filter(
        (name) => !DEFAULT_PINNED_STAT_NAMES.includes(name),
      ),
    )
  })

  it('pins a stat from All stats into the group named after its All stats group, creating it when missing', async () => {
    render(<StatsPanel />)
    await userEvent.click(within(allStatsSection()).getByRole('button', { name: 'Pin Spell pen' }))
    await userEvent.click(within(allStatsSection()).getByRole('button', { name: 'Pin HP' }))

    expect(pinnedStatNamesByGroupLabel()).toEqual({
      ...DEFAULT_STAT_NAMES_BY_GROUP_LABEL,
      Offense: [...DEFAULT_STAT_NAMES_BY_GROUP_LABEL.Offense, 'Spell pen'],
      Defense: ['HP'],
    })
    expect(statNamesInAllStats()).not.toContain('Spell pen')
    expect(statNamesInAllStats()).not.toContain('HP')
  })

  it('unpins a stat back into All stats and drops the group it emptied', async () => {
    render(<StatsPanel />)
    await userEvent.click(
      within(pinnedSection()).getByRole('button', { name: 'Unpin Spell points' }),
    )

    expect(pinnedStatNamesByGroupLabel()).toEqual({
      Offense: DEFAULT_STAT_NAMES_BY_GROUP_LABEL.Offense,
    })
    const resourcesInAllStats = within(allStatsSection())
      .getByRole('heading', { name: 'Resources' })
      .closest('section')!
    expect(statNamesBehindButtons(resourcesInAllStats, /^Pin /)).toContain('Spell points')
  })

  it('keeps focus on the moved stat’s pin button after pinning or unpinning it with the keyboard', async () => {
    render(<StatsPanel />)
    act(() => within(allStatsSection()).getByRole('button', { name: 'Pin HP' }).focus())
    await userEvent.keyboard('{Enter}')
    expect(within(pinnedSection()).getByRole('button', { name: 'Unpin HP' })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(within(allStatsSection()).getByRole('button', { name: 'Pin HP' })).toHaveFocus()
  })

  it('moves focus to the first remaining group’s name after a group is deleted, then to the Stats tab once none is left', async () => {
    render(<StatsPanel />)
    act(() => within(pinnedSection()).getByRole('button', { name: 'Delete Offense group' }).focus())
    await userEvent.keyboard('{Enter}')
    expect(
      within(pinnedGroupElement('Resources')).getByRole('textbox', { name: 'Group name' }),
    ).toHaveFocus()

    act(() =>
      within(pinnedSection()).getByRole('button', { name: 'Delete Resources group' }).focus(),
    )
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('tab', { name: 'Stats' })).toHaveFocus()
  })

  it('hides an All stats group whose stats are all pinned', async () => {
    render(<StatsPanel />)
    const resourcesStats = PLACEHOLDER_STAT_GROUPS.find((group) => group.name === 'Resources')!
    for (const stat of resourcesStats.stats) {
      if (DEFAULT_PINNED_STAT_NAMES.includes(stat.name)) continue
      await userEvent.click(
        within(allStatsSection()).getByRole('button', { name: `Pin ${stat.name}` }),
      )
    }
    expect(
      within(allStatsSection()).queryByRole('heading', { name: 'Resources' }),
    ).not.toBeInTheDocument()
  })

  it('renames a group and keeps pinning that group’s stats into it', async () => {
    render(<StatsPanel />)
    const offenseGroup = within(pinnedSection()).getByRole('group', { name: 'Offense' })
    const labelInput = within(offenseGroup).getByRole('textbox', { name: 'Group name' })

    await userEvent.clear(labelInput)
    await userEvent.type(labelInput, 'Casting')
    await userEvent.click(within(allStatsSection()).getByRole('button', { name: 'Pin Spell pen' }))

    expect(pinnedStatNamesByGroupLabel()).toEqual({
      Casting: [...DEFAULT_STAT_NAMES_BY_GROUP_LABEL.Offense, 'Spell pen'],
      Resources: DEFAULT_STAT_NAMES_BY_GROUP_LABEL.Resources,
    })
  })

  it('deletes a group, returning its stats to All stats, and shows the pin zone once no group is left', async () => {
    render(<StatsPanel />)
    expect(screen.queryByText('Drag a stat here to pin it')).not.toBeInTheDocument()

    const deleteOffense = within(pinnedSection()).getByRole('button', {
      name: 'Delete Offense group',
    })
    expect(deleteOffense).toHaveAttribute('title', 'Delete group — its stats return to All stats')
    await userEvent.click(deleteOffense)

    expect(pinnedStatNamesByGroupLabel()).toEqual({
      Resources: DEFAULT_STAT_NAMES_BY_GROUP_LABEL.Resources,
    })
    for (const statName of DEFAULT_STAT_NAMES_BY_GROUP_LABEL.Offense) {
      expect(statNamesInAllStats()).toContain(statName)
    }

    await userEvent.click(
      within(pinnedSection()).getByRole('button', { name: 'Delete Resources group' }),
    )
    expect(within(pinnedSection()).queryAllByRole('group')).toHaveLength(0)
    expect(within(pinnedSection()).getByText('Drag a stat here to pin it')).toBeInTheDocument()
    expect(statNamesInAllStats()).toEqual(ALL_STATS.map((stat) => stat.name))
  })

  describe('dragging with the keyboard', () => {
    beforeEach(layOutElementsInDocumentOrder)
    afterEach(() => vi.restoreAllMocks())

    async function dragWithKeyboard(statName: string, arrowKeys: string): Promise<void> {
      act(() => screen.getByRole('button', { name: `Move ${statName}` }).focus())
      await userEvent.keyboard(' ')
      await userEvent.keyboard(arrowKeys)
      await userEvent.keyboard(' ')
    }

    it('reorders a pinned stat within its group', async () => {
      render(<StatsPanel />)
      await dragWithKeyboard('Evocation DC', '{ArrowDown}')
      expect(pinnedStatNamesByGroupLabel()).toEqual({
        Offense: ['Spell power (fire)', 'Evocation DC', 'Spell crit'],
        Resources: ['Spell points'],
      })
    })

    it('moves a pinned stat into another group before the row it lands on and drops the emptied group', async () => {
      render(<StatsPanel />)
      await dragWithKeyboard('Spell points', '{ArrowUp}{ArrowUp}')
      expect(pinnedStatNamesByGroupLabel()).toEqual({
        Offense: ['Evocation DC', 'Spell power (fire)', 'Spell points', 'Spell crit'],
      })
    })

    it('pins a stat dragged up from All stats', async () => {
      render(<StatsPanel />)
      await dragWithKeyboard('HP', '{ArrowUp}')
      expect(pinnedStatNamesByGroupLabel()).toEqual({
        Offense: DEFAULT_STAT_NAMES_BY_GROUP_LABEL.Offense,
        Resources: ['HP', 'Spell points'],
      })
      expect(statNamesInAllStats()).not.toContain('HP')
    })
  })

  describe('dragging with the pointer', () => {
    beforeEach(layOutElementsAroundTheirDescendants)
    afterEach(() => vi.restoreAllMocks())

    it('appends a stat released inside a group but outside its rows to the end of that group', () => {
      render(<StatsPanel />)
      dragWithPointer('Spell crit', () => pinnedGroupElement('Resources'))
      expect(pinnedStatNamesByGroupLabel()).toEqual({
        Offense: ['Evocation DC', 'Spell power (fire)'],
        Resources: ['Spell points', 'Spell crit'],
      })
    })

    it('keeps a stat pinned where it was when it is released in the pinned section outside every group', () => {
      render(<StatsPanel />)
      dragWithPointer('Spell points', () => screen.getByRole('separator'))
      expect(pinnedStatNamesByGroupLabel()).toEqual(DEFAULT_STAT_NAMES_BY_GROUP_LABEL)
    })

    it('unpins a stat released over All stats and announces that it was unpinned', () => {
      render(<StatsPanel />)
      dragWithPointer('Spell points', allStatsSection)
      expect(pinnedStatNamesByGroupLabel()).toEqual({
        Offense: DEFAULT_STAT_NAMES_BY_GROUP_LABEL.Offense,
      })
      expect(screen.getByRole('status')).toHaveTextContent('Spell points was unpinned.')
    })
  })

  it('changes the count in the Buffs tab label when a buff is toggled', async () => {
    render(<StatsPanel />)
    const defaultActiveCount = DEFAULT_ACTIVE_BUFF_NAMES.length
    const buffsPanel = await openTab(`Buffs ${defaultActiveCount}`)

    const inactiveBuff = ALL_BUFFS.find((buff) => !DEFAULT_ACTIVE_BUFF_NAMES.includes(buff.name))!
    const inactiveBuffSwitch = within(buffsPanel).getByRole('switch', { name: inactiveBuff.name })
    expect(inactiveBuffSwitch).not.toBeChecked()

    await userEvent.click(inactiveBuffSwitch)
    expect(inactiveBuffSwitch).toBeChecked()
    expect(screen.getByRole('tab', { name: `Buffs ${defaultActiveCount + 1}` })).toBeInTheDocument()

    await userEvent.click(
      within(buffsPanel).getByRole('switch', { name: DEFAULT_ACTIVE_BUFF_NAMES[0] }),
    )
    await userEvent.click(inactiveBuffSwitch)
    expect(screen.getByRole('tab', { name: `Buffs ${defaultActiveCount - 1}` })).toBeInTheDocument()
  })

  it('expands a buff row to show its effects and duration', async () => {
    render(<StatsPanel />)
    const buffsPanel = await openTab(/^Buffs/)
    const buff = ALL_BUFFS.find((candidate) =>
      candidate.effects.every((effect) => !effect.overriddenBy && !effect.overrides),
    )!

    await userEvent.click(
      within(buffsPanel).getByRole('button', {
        name: (accessibleName) => accessibleName.startsWith(buff.name),
      }),
    )

    const effectList = within(buffsPanel).getByRole('list', { name: `${buff.name} effects` })
    expect(within(effectList).getAllByRole('listitem')).toHaveLength(buff.effects.length)
    expect(within(buffsPanel).getByText(buff.duration)).toBeInTheDocument()
  })

  it('expands a pinned stat row into its bonus breakdown and collapses it again', async () => {
    render(<StatsPanel />)
    const statWithBonuses = ALL_STATS.find(
      (stat) => stat.bonuses && DEFAULT_PINNED_STAT_NAMES.includes(stat.name),
    )!
    const bonuses = statWithBonuses.bonuses!

    const rowToggle = statRowToggleFor(pinnedSection(), statWithBonuses.name)
    await userEvent.click(rowToggle)

    const breakdown = within(pinnedSection()).getByRole('list', {
      name: `${statWithBonuses.name} bonuses`,
    })
    const breakdownRows = within(breakdown).getAllByRole('listitem')
    expect(breakdownRows).toHaveLength(bonuses.length)
    bonuses.forEach((bonus, index) => {
      expect(breakdownRows[index]).toHaveTextContent(bonus.source)
      expect(breakdownRows[index]).toHaveTextContent(bonus.value)
    })

    await userEvent.click(rowToggle)
    expect(
      within(pinnedSection()).queryByRole('list', { name: `${statWithBonuses.name} bonuses` }),
    ).not.toBeInTheDocument()
  })

  it('shows the Phase 6 note for a stat with no breakdown yet', async () => {
    render(<StatsPanel />)
    const statWithoutBonuses = ALL_STATS.find(
      (stat) => !stat.bonuses && !DEFAULT_PINNED_STAT_NAMES.includes(stat.name),
    )!

    await userEvent.click(statRowToggleFor(allStatsSection(), statWithoutBonuses.name))

    const breakdown = within(allStatsSection()).getByRole('list', {
      name: `${statWithoutBonuses.name} bonuses`,
    })
    expect(within(breakdown).getByRole('listitem')).toHaveTextContent(
      'Breakdown by bonus type · wired in Phase 6',
    )
  })

  it('shows the warning glyph only on stats with an overridden bonus', () => {
    render(<StatsPanel />)

    function overriddenWarningOn(container: HTMLElement, statName: string): HTMLElement | null {
      return within(statRowToggleFor(container, statName)).queryByRole('img', {
        name: /overridden bonus/,
      })
    }

    expect(overriddenWarningOn(pinnedSection(), 'Spell power (fire)')).toHaveAttribute(
      'title',
      '2 overridden bonuses',
    )
    expect(overriddenWarningOn(pinnedSection(), 'Evocation DC')).toHaveAttribute(
      'title',
      '1 overridden bonus',
    )
    expect(overriddenWarningOn(allStatsSection(), 'HP')).not.toBeInTheDocument()
  })

  it('gives each row a grip handle and a pin button titled for where the stat goes', () => {
    render(<StatsPanel />)
    expect(
      within(pinnedSection()).getByRole('button', { name: 'Move Evocation DC' }),
    ).toHaveAttribute('title', 'Drag to reorder or move to another group')
    expect(
      within(pinnedSection()).getByRole('button', { name: 'Unpin Evocation DC' }),
    ).toHaveAttribute('title', 'Unpin — move back to its group')
    expect(within(allStatsSection()).getByRole('button', { name: 'Move HP' })).toHaveAttribute(
      'title',
      'Drag to the pinned section',
    )
    expect(within(allStatsSection()).getByRole('button', { name: 'Pin HP' })).toHaveAttribute(
      'title',
      'Pin',
    )
  })

  it('moves between tabs with the arrow, Home and End keys, keeping only the active tab tabbable', async () => {
    render(<StatsPanel />)
    const statsTab = screen.getByRole('tab', { name: 'Stats' })
    const buffsTab = screen.getByRole('tab', { name: /^Buffs/ })
    expect(statsTab).toHaveAttribute('tabindex', '0')
    expect(buffsTab).toHaveAttribute('tabindex', '-1')

    act(() => statsTab.focus())
    await userEvent.keyboard('{ArrowRight}')
    expect(buffsTab).toHaveFocus()
    expect(buffsTab).toHaveAttribute('aria-selected', 'true')
    expect(buffsTab).toHaveAttribute('tabindex', '0')
    expect(statsTab).toHaveAttribute('tabindex', '-1')

    await userEvent.keyboard('{ArrowRight}')
    expect(statsTab).toHaveFocus()
    expect(statsTab).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{ArrowLeft}')
    expect(buffsTab).toHaveFocus()

    await userEvent.keyboard('{Home}')
    expect(statsTab).toHaveFocus()

    await userEvent.keyboard('{End}')
    expect(buffsTab).toHaveFocus()
    expect(buffsTab).toHaveAttribute('aria-selected', 'true')

    act(() => statsTab.focus())
    expect(statsTab).toHaveAttribute('aria-selected', 'true')
  })
})
