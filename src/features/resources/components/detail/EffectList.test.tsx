import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HoverCardProvider, StructuredDetailCard, detailCardSection } from '../../../../components'
import type { ApiEffect, ApiEffectDetail, ApiItemDetail, ApiSetDetail } from '../../../../lib/api'
import capturedItem from '../../queries/fixtures/effects-item.json'
import capturedWeapon from '../../queries/fixtures/effects-item-3479.json'
import capturedShield from '../../queries/fixtures/effects-item-8203.json'
import capturedArmor from '../../queries/fixtures/effects-item-831.json'
import capturedRiposteItem from '../../queries/fixtures/effects-item-2430.json'
import capturedRiposteDetail from '../../queries/fixtures/effect-detail-384.json'
import capturedCharismaDetail from '../../queries/fixtures/effect-detail-6.json'
import capturedDefaultRiposteItem from '../../queries/fixtures/effects-item-490.json'
import capturedConstantItem from '../../queries/fixtures/effects-item-454.json'
import capturedConstantDetail from '../../queries/fixtures/effect-detail-328.json'
import capturedSet from '../../queries/fixtures/effects-set.json'
import capturedLargerSet from '../../queries/fixtures/effects-set-93.json'
import capturedTextOnlyItem from '../../queries/fixtures/effects-item-3479.json'
import capturedGroupAugment from '../../queries/fixtures/effects-augment-633.json'
import capturedMixedGroupItem from '../../queries/fixtures/effects-item-457.json'
import {
  toEffect,
  toItem,
  type Effect,
  type Item,
  type ResourceModifier,
} from '../../queries/items'
import { toSetDetail, type SetDetail } from '../../queries/sets'
import { EffectListFullView, EffectListBriefView } from './EffectList'
import { itemEffectRows, setEffectRows } from './effectRows'

function EffectList({
  item,
  itemName = '',
  effects,
  modifiers = [],
  setDetail,
  matchingBonuses = [],
  variant = 'pane',
  onOpenItem,
}: {
  item?: Item
  itemName?: string
  effects: Effect[]
  modifiers?: ResourceModifier[]
  setDetail?: SetDetail | null
  matchingBonuses?: string[]
  variant?: 'pane' | 'hover'
  onOpenItem?: (id: number, name: string) => void
}): React.JSX.Element {
  const itemRows = [
    ...itemEffectRows({ item, effects, itemName, modifiers, matchingBonuses, onOpenItem }),
    ...(setDetail ? setEffectRows(setDetail, matchingBonuses, onOpenItem) : []),
  ]
  const sections = [
    ...(itemRows.length
      ? [
          detailCardSection({
            key: 'effects',
            heading: 'Enchantments',
            entries: itemRows,
            FullView: EffectListFullView,
            BriefView: EffectListBriefView,
            briefEntryLimit: 5,
          }),
        ]
      : []),
  ]
  return (
    <StructuredDetailCard
      variant={variant}
      kicker="Item"
      name="Item"
      facts={[]}
      sections={sections}
    />
  )
}

let effectWikiUrl: string | null = null
let effectDetail: ApiEffectDetail | null = null
vi.mock('../../queries/useItems', () => ({
  useEffectDetail: (_path: string, isEnabled = true) => ({
    data: isEnabled
      ? (effectDetail ?? {
          ...capturedCharismaDetail,
          kind: 'effect',
          wiki_url: effectWikiUrl,
          bonuses: [],
          damage: [],
        })
      : undefined,
  }),
  useSet: () => ({ isPending: true }),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  effectWikiUrl = null
  effectDetail = null
})

function itemEffect(): Effect {
  return toEffect(capturedItem.effects[0] as ApiEffect, 0)
}

function renderEffects(effects: Effect[], matchingBonuses: string[] = []): void {
  render(
    <HoverCardProvider>
      <EffectList effects={effects} matchingBonuses={matchingBonuses} />
    </HoverCardProvider>,
  )
}

it('shows the effect name in the sortable cell and its verbose name and description on hover', () => {
  vi.useFakeTimers()
  renderEffects([itemEffect()])
  const row = screen.getByRole('row', { name: /Charisma Enhancement \+8/ })
  expect(within(row).getByText('Charisma')).toHaveClass('resources-effect-name')
  expect(within(row).queryByText('Enhancement Charisma 8')).toBeNull()
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  const verbose = within(card).getByText('Enhancement Charisma 8')
  const stat = card.querySelector('.resources-effect-ungrouped-bonus')!
  const description = within(card).getByText('Passive: 8 Enhancement bonus to Charisma.')
  expect(card.querySelector('.detail-card__name')!.compareDocumentPosition(verbose) & 4).toBe(4)
  expect(verbose.compareDocumentPosition(stat) & 4).toBe(4)
  expect(stat.compareDocumentPosition(description) & 4).toBe(4)
})

it('shows a captured text-only effect name and keeps its prose on hover', () => {
  vi.useFakeTimers()
  const effect = toEffect(capturedTextOnlyItem.effects[0] as ApiEffect, 0)
  renderEffects([effect])
  const row = screen.getByRole('row', { name: /Anarchic Blast 3/ })
  expect(within(row).getByText('Anarchic Blast 3')).toBeInTheDocument()
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(within(card).getAllByText('Anarchic Blast 3')).toHaveLength(1)
  expect(card).toHaveTextContent('This weapon is a chaotic conduit')
})

it('shows dashes in the type and value columns of a text-only effect', () => {
  const effect = toEffect(capturedTextOnlyItem.effects[0] as ApiEffect, 0)
  const view = render(
    <HoverCardProvider>
      <EffectList effects={[effect]} />
    </HoverCardProvider>,
  )
  const row = screen.getByRole('row', { name: /Anarchic Blast 3/ })
  expect(
    within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent),
  ).toEqual(['Anarchic Blast 3', '—', '—'])
  expect(within(row).getAllByText('—')).toHaveLength(2)
  view.rerender(
    <HoverCardProvider>
      <EffectList effects={[effect]} variant="hover" />
    </HoverCardProvider>,
  )
  expect(
    screen.getByText('Anarchic Blast 3').closest('.resources-hover-effect-row'),
  ).toHaveTextContent('Anarchic Blast 3——')
})

it('sorts the Enchantment column by effect name rather than verbose name', () => {
  const first = { ...itemEffect(), id: 3000, name: 'Alpha', verboseName: 'Zeta Alpha' }
  const second = { ...itemEffect(), id: 3001, name: 'Zulu', verboseName: 'Alpha Zulu' }
  renderEffects([second, first])
  fireEvent.click(screen.getByRole('columnheader', { name: 'Enchantment' }))
  expect(
    screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.querySelector('.resources-effect-name')?.textContent),
  ).toEqual(['Alpha', 'Zulu'])
})

it('puts a weapon enhancement first, sorts it with effects, and never marks it as a Bonuses match', () => {
  const item = toItem(capturedWeapon as ApiItemDetail)
  render(
    <HoverCardProvider>
      <EffectList item={item} effects={item.effects} matchingBonuses={['Enhancement Bonus']} />
    </HoverCardProvider>,
  )
  const enhancement = screen.getByRole('row', { name: 'Enhancement Bonus Enhancement +5' })
  expect(screen.getAllByRole('row')[1]).toBe(enhancement)
  expect(enhancement).not.toHaveClass('ledger-row--highlighted')
  expect(within(enhancement).getByText('+5')).toHaveClass('num')
  fireEvent.click(screen.getByRole('columnheader', { name: 'Enchantment' }))
  expect(screen.getAllByRole('row')[1]).toHaveTextContent('Aligned')
  expect(screen.getAllByRole('row').indexOf(enhancement)).toBeGreaterThan(1)
})

it('sorts a shield enhancement by Type and Value alongside its effects', () => {
  const item = toItem(capturedShield as ApiItemDetail)
  render(
    <HoverCardProvider>
      <EffectList item={item} effects={item.effects} />
    </HoverCardProvider>,
  )
  const enhancement = screen.getByRole('row', { name: 'Enhancement Bonus Enhancement +5' })
  fireEvent.click(screen.getByRole('columnheader', { name: 'Type' }))
  expect(screen.getAllByRole('row')[1]).toBe(enhancement)
  fireEvent.click(screen.getByRole('columnheader', { name: 'Value' }))
  expect(screen.getAllByRole('row').at(-1)).toBe(enhancement)
})

it('shows the enhancement title, verbose line and weapon description in hover order', () => {
  vi.useFakeTimers()
  const item = toItem(capturedWeapon as ApiItemDetail)
  render(
    <HoverCardProvider>
      <EffectList item={item} effects={item.effects} />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByRole('row', { name: 'Enhancement Bonus Enhancement +5' }))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  const title = within(card).getByText('Enhancement Bonus')
  const verbose = within(card).getByText('+5 Enhancement Bonus')
  const description = within(card).getByText('+5 enhancement bonus to attack and damage rolls.')
  expect(title.compareDocumentPosition(verbose) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(
    verbose.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
})

it('keeps the enhancement value associated with its source item on hover', () => {
  vi.useFakeTimers()
  const item = toItem(capturedWeapon as ApiItemDetail)
  render(
    <HoverCardProvider>
      <EffectList item={item} itemName={item.name} effects={item.effects} />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByRole('row', { name: 'Enhancement Bonus Enhancement +5' }))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent(`From ${item.name}`)
  expect(within(card).getByText('+5')).toHaveTextContent('+5')
  expect(within(card).getByText('+5').closest('.detail-card__fact')).toHaveTextContent('Value')
  expect(card).toHaveTextContent('+5 enhancement bonus to attack and damage rolls.')
})

it('uses the shield and armor descriptions in enhancement hovers', () => {
  vi.useFakeTimers()
  for (const [captured, description] of [
    [capturedShield, '+5 enhancement bonus to Armor Class, attack and damage rolls.'],
    [capturedArmor, '+5 enhancement bonus to Armor Class.'],
  ] as const) {
    const item = toItem(captured as ApiItemDetail)
    const view = render(
      <HoverCardProvider>
        <EffectList item={item} effects={item.effects} />
      </HoverCardProvider>,
    )
    fireEvent.mouseEnter(screen.getByRole('row', { name: 'Enhancement Bonus Enhancement +5' }))
    act(() => vi.advanceTimersByTime(120))
    expect(screen.getByRole('dialog')).toHaveTextContent(description)
    view.unmount()
  }
})

it('folds set tiers by default, then shows the matching effect line when opened', () => {
  const set = toSetDetail(capturedSet as ApiSetDetail)
  render(
    <HoverCardProvider>
      <EffectList effects={[]} setDetail={set} matchingBonuses={['Positive Spell Power']} />
    </HoverCardProvider>,
  )
  const heading = screen.getByRole('row', { name: /Devoted Heart/ })
  expect(within(heading).queryByRole('button')).toBeNull()
  expect(heading).not.toHaveClass('ledger-row--highlighted')
  expect(heading).toHaveAttribute('aria-expanded', 'false')
  expect(heading).toHaveTextContent('1 bonus')
  expect(screen.queryByText('2 pieces')).toBeNull()
  fireEvent.click(heading)
  expect(heading).toHaveAttribute('aria-expanded', 'true')
  expect(heading).toHaveTextContent('Hide')
  expect(screen.getByText('2 pieces')).toBeInTheDocument()
  expect(screen.getByRole('row', { name: /Positive Spell Power/ })).toHaveClass(
    'ledger-row--highlighted',
  )
})

it('keeps the set name hover card on the open heading', () => {
  vi.useFakeTimers()
  const set = toSetDetail(capturedLargerSet as ApiSetDetail)
  render(
    <HoverCardProvider>
      <EffectList effects={[]} setDetail={set} />
    </HoverCardProvider>,
  )
  const heading = screen.getByRole('row', { name: /Adherent of the Mists/ })
  expect(heading).toHaveTextContent('7 bonuses')
  expect(screen.getAllByRole('row')).toHaveLength(2)
  fireEvent.mouseEnter(heading)
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getByRole('dialog')).toHaveTextContent('Loading set…')
})

it('toggles a set from the roving row and sorts its opened effects within the tier', () => {
  const set = toSetDetail(capturedLargerSet as ApiSetDetail)
  render(
    <HoverCardProvider>
      <EffectList effects={[]} setDetail={set} />
    </HoverCardProvider>,
  )
  const heading = screen.getByRole('row', { name: /Adherent of the Mists/ })
  act(() => heading.focus())
  expect(heading).toHaveFocus()
  fireEvent.keyDown(heading, { key: 'Enter' })
  expect(heading).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('row', { name: /5 pieces/ })).toHaveClass('ledger-row--subheading')
  fireEvent.click(screen.getByRole('columnheader', { name: 'Value' }))
  expect(
    screen
      .getAllByRole('row')
      .slice(3)
      .map((row) => row.querySelector('.resources-effect-value')?.textContent),
  ).toEqual(['+10', '+10', '+10', '+10', '+5', '+5', '+5'])
  fireEvent.keyDown(heading, { key: ' ' })
  expect(heading).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getAllByRole('row')).toHaveLength(2)
})

it('shows one rendered line for a single stat and its stat row on hover', () => {
  vi.useFakeTimers()
  renderEffects([itemEffect()], ['Charisma'])
  const row = screen.getByRole('row', { name: /Charisma Enhancement \+8/ })
  expect(row).toHaveTextContent('Charisma')
  expect(row).toHaveTextContent('Enhancement')
  expect(row).toHaveClass('ledger-row--highlighted')
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(120))
  expect(within(screen.getByRole('dialog')).getAllByText('Charisma')).toHaveLength(2)
  expect(screen.getByText('Matches your Bonuses filter')).toBeInTheDocument()
})

it('links the family name when its detail has a wiki URL', () => {
  vi.useFakeTimers()
  effectWikiUrl = 'https://ddowiki.com/page/Charisma'
  renderEffects([itemEffect()])
  fireEvent.mouseEnter(screen.getByRole('row', { name: /Charisma Enhancement \+8/ }))
  act(() => vi.advanceTimersByTime(120))
  expect(
    within(screen.getByRole('dialog')).getByRole('link', { name: 'Charisma' }),
  ).toHaveAttribute('href', effectWikiUrl)
})

it('uses the detail kind for the hover card kicker', () => {
  vi.useFakeTimers()
  effectDetail = capturedCharismaDetail as ApiEffectDetail
  renderEffects([itemEffect()])
  fireEvent.mouseEnter(screen.getByRole('row', { name: /Charisma Enhancement \+8/ }))
  act(() => vi.advanceTimersByTime(120))
  expect(
    screen.getByRole('dialog').querySelector('.detail-card__kicker-row .section-label'),
  ).toHaveTextContent('Stat')
})

it('keeps a multi-stat effect on one line and matches either stat with a type', () => {
  const effect = {
    ...itemEffect(),
    id: 200,
    name: 'Firestorm Lore',
    verboseName: 'Firestorm Lore +15%',
    bonuses: [
      {
        statName: 'Fire Lore',
        statCategory: 'magical',
        bonusType: 'Insightful',
        value: 15,
        amountSource: 'owner' as const,
        scale: 1,
        group: null,
      },
      {
        statName: 'Air Lore',
        statCategory: 'magical',
        bonusType: 'Insightful',
        value: 15,
        amountSource: 'owner' as const,
        scale: 1,
        group: null,
      },
    ],
  }
  renderEffects([effect], ['Air Lore:Insightful'])
  expect(screen.getAllByRole('row', { name: /Firestorm Lore/ })).toHaveLength(1)
  expect(screen.getByRole('row', { name: /Firestorm Lore/ })).toHaveClass('ledger-row--highlighted')
})

it('keeps a captured group bonus on one line and reveals its member stats on hover', () => {
  vi.useFakeTimers()
  const groupEffect = capturedGroupAugment.effects.find(
    (effect) => effect.name === 'Skills Charisma',
  )
  expect(groupEffect).toBeDefined()
  renderEffects([toEffect(groupEffect as ApiEffect, 0)], ['Charisma Skills'])
  const row = screen.getByRole('row', { name: /Skills Charisma Exceptional \+6/ })
  expect(screen.getAllByRole('row', { name: /Skills Charisma Exceptional \+6/ })).toHaveLength(1)
  expect(row).toHaveClass('ledger-row--highlighted')
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent('Charisma Skills')
  for (const stat of [
    'Bluff',
    'Diplomacy',
    'Haggle',
    'Intimidate',
    'Perform',
    'Use Magic Device',
  ]) {
    expect(within(card).getByText(stat)).toBeInTheDocument()
  }
})

it('separates a captured grouped skill bonus from an ungrouped Hide penalty', () => {
  vi.useFakeTimers()
  const command = capturedMixedGroupItem.effects.find((effect) => effect.name === 'Command')
  expect(command).toBeDefined()
  renderEffects([toEffect(command as ApiEffect, 0)])
  fireEvent.mouseEnter(screen.getByRole('row', { name: /Command/ }))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  const group = card.querySelector('.resources-effect-bonus-group')!
  expect(group).toHaveTextContent('Charisma Skills')
  expect(group).toHaveTextContent('Insight')
  expect(group).toHaveTextContent('+5')
  expect(group.querySelector('.resources-effect-group-member')).toHaveTextContent('Bluff')
  expect(group).not.toHaveTextContent('Hide')
  const ungrouped = card.querySelector('.resources-effect-ungrouped-bonus')!
  expect(ungrouped).toHaveTextContent('Hide')
  expect(ungrouped).toHaveTextContent('Penalty')
  expect(ungrouped).toHaveTextContent('-6')
  expect(group.compareDocumentPosition(ungrouped) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it.each(['Diplomacy', 'Diplomacy:Exceptional'])(
  'highlights a group line through its member %s',
  (selectedBonus) => {
    const groupEffect = capturedGroupAugment.effects.find(
      (effect) => effect.name === 'Skills Charisma',
    )
    renderEffects([toEffect(groupEffect as ApiEffect, 0)], [selectedBonus])
    expect(screen.getByRole('row', { name: /Skills Charisma Exceptional \+6/ })).toHaveClass(
      'ledger-row--highlighted',
    )
  },
)

it('keeps a text-only effect without a value or stat rows', () => {
  renderEffects([
    {
      ...itemEffect(),
      name: 'Supreme Good',
      verboseName: 'Supreme Good',
      value: null,
      bonuses: [],
      bonusType: null,
    },
  ])
  const row = screen.getByRole('row', { name: /Supreme Good/ })
  expect(row).toHaveTextContent('Supreme Good')
  expect(row).not.toHaveTextContent('+8')
})

it('shows a tier step on hover and matches its family name', () => {
  vi.useFakeTimers()
  const effect = {
    ...itemEffect(),
    name: 'Spell Lore II',
    tier: { group: 'Spell Lore', rank: 2 },
  }
  renderEffects([effect], ['Spell Lore II'])
  const row = screen.getByRole('row', { name: /Spell Lore II/ })
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getByRole('dialog')).toHaveTextContent('Spell Lore · Step 2')
})

it('explains rounded up and rounded down bonuses from a captured Riposte item', () => {
  vi.useFakeTimers()
  effectDetail = capturedRiposteDetail as ApiEffectDetail
  const riposte = capturedRiposteItem.effects.find((entry) => entry.effect_id === 384)
  expect(riposte).toBeDefined()
  const effect = toEffect(riposte as ApiEffect, 0)
  renderEffects([effect])
  const row = screen.getByRole('row', { name: /Riposte/ })
  expect(within(row).getByLabelText('Calculated')).toBeInTheDocument()
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent('Riposte: half of 5, rounded up')
  expect(card).toHaveTextContent('Riposte: half of 5, rounded down')
  expect(card).toHaveTextContent('+3')
  expect(card).toHaveTextContent('+2')
  expect(within(card).getAllByText('Calculated')).toHaveLength(2)
  cleanup()
  render(<EffectList effects={[effect]} variant="hover" />)
  expect(screen.getByText('Riposte').closest('.resources-hover-effect-row')).toHaveTextContent('≈')
})

it('explains a default amount and a fixed amount from captured effect lines', () => {
  vi.useFakeTimers()
  effectDetail = capturedRiposteDetail as ApiEffectDetail
  const defaultLine = capturedDefaultRiposteItem.effects.find((entry) => entry.effect_id === 384)
  expect(defaultLine).toBeDefined()
  renderEffects([toEffect(defaultLine as ApiEffect, 0)])
  fireEvent.mouseEnter(screen.getByRole('row', { name: /Riposte/ }))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getByRole('dialog')).toHaveTextContent('half of 2 (effect default)')
  cleanup()
  effectDetail = capturedConstantDetail as ApiEffectDetail
  const fixedLine = capturedConstantItem.effects.find((entry) => entry.effect_id === 328)
  expect(fixedLine).toBeDefined()
  renderEffects([toEffect(fixedLine as ApiEffect, 0)])
  fireEvent.mouseEnter(screen.getByRole('row', { name: /Curse of Weakness/ }))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getByRole('dialog')).toHaveTextContent('Fixed at -1 by the effect')
})

it('renders effect damage underneath its line', () => {
  const effect = toEffect(
    {
      ...capturedItem.effects[0],
      name: 'Acid II',
      verbose_name: 'Acid II',
      bonuses: [],
      damage: [
        {
          trigger: 'On Hit',
          damage_type: 'Acid',
          dice_number: 1,
          dice_sides: 7,
          dice_bonus: 1,
          amount_from: 1,
          scale: 1,
        },
      ],
    } as ApiEffect,
    0,
  )
  renderEffects([effect])
  const row = screen.getByRole('row', { name: /Acid II/ })
  expect(within(row).getByText('On Hit: 1d7+1 Acid')).toBeInTheDocument()
})

it('bands set tier effect lines after the item and keeps the value column sortable', async () => {
  const set = toSetDetail(capturedSet as ApiSetDetail)
  render(
    <HoverCardProvider>
      <EffectList
        effects={[itemEffect()]}
        setDetail={set}
        matchingBonuses={['Positive Spell Power']}
      />
    </HoverCardProvider>,
  )
  expect(screen.getByText('Devoted Heart')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('row', { name: /Devoted Heart/ }))
  expect(screen.getByText('2 pieces')).toBeInTheDocument()
  expect(screen.getByRole('row', { name: /Positive Spell Power/ })).toHaveClass(
    'ledger-row--highlighted',
  )
  fireEvent.click(screen.getByRole('columnheader', { name: /Value/ }))
  expect(screen.getByRole('row', { name: /Positive Spell Power/ })).toBeInTheDocument()
})
