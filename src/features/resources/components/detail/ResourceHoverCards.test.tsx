import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HoverCardProvider } from '../../../../components'
import {
  QuestHoverAnchor,
  SetHoverAnchor,
  SourceHoverAnchor,
  AugmentHoverContent,
  ItemHoverContent,
} from './ResourceHoverCards'
import capturedItem from '../../queries/fixtures/item7631.json'
import adventurePack from '../../queries/fixtures/adventure-packs.json'
import questChain from '../../queries/fixtures/quest-chains.json'
import saga from '../../queries/fixtures/sagas.json'
import craftingSystem from '../../queries/fixtures/crafting-systems.json'
import vendor from '../../queries/fixtures/vendors.json'
import event from '../../queries/fixtures/events.json'
import augment from '../../queries/fixtures/augment77.json'
import type { ApiAugmentDetail, ApiItemDetail } from '../../../../lib/api'
import { toAugmentDetail, toItem } from '../../queries/items'
import {
  toAdventurePack,
  toQuestChain,
  toSaga,
  toCraftingSystem,
  toVendor,
  toEvent,
} from '../../queries/sources'

const navigateMock = vi.fn()
let hasItemDamage = false
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }))
vi.mock('../../queries/useItems', () => ({
  useItem: () => ({
    isPending: false,
    data: toItem({
      ...(capturedItem as ApiItemDetail),
      modifiers: hasItemDamage ? [augment.modifiers[0]] : [],
    }),
  }),
  useAugment: () => ({ isPending: false, data: toAugmentDetail(augment as ApiAugmentDetail) }),
  useFittingAugmentsBySlotLabel: () => ({ data: [], isPending: false, error: null }),
  useAdventurePack: () => ({ isPending: false, data: toAdventurePack(adventurePack) }),
  useQuestChain: () => ({ isPending: false, data: toQuestChain(questChain) }),
  useSaga: () => ({ isPending: false, data: toSaga(saga) }),
  useCraftingSystem: () => ({ isPending: false, data: toCraftingSystem(craftingSystem) }),
  useVendor: () => ({ isPending: false, data: toVendor(vendor) }),
  useEvent: () => ({ isPending: false, data: toEvent(event) }),
  useQuest: () => ({
    isPending: false,
    data: {
      id: 7,
      name: 'The Storm',
      pack: 'Storm Pack',
      isRaid: true,
      items: [
        {
          id: 11,
          name: 'Storm Blade',
          slot: 'Main Hand',
          minimumLevel: 20,
        },
        {
          id: 11,
          name: 'Storm Blade',
          slot: 'Main Hand',
          minimumLevel: 20,
        },
      ],
    },
  }),
  useSet: () => ({
    isPending: false,
    data: {
      id: 3,
      name: 'Storm Set',
      items: [{ id: 11, name: 'Storm Blade', slot: 'Main Hand', minimumLevel: 20 }],
      tiers: [
        {
          equippedCount: 2,
          description: 'Storm tier unlock',
          bonuses: [
            {
              key: 'bonus-1',
              name: 'Fire Spell Power',
              description: 'Fire damage boost',
              type: 'Artifact',
              value: 20,
            },
          ],
        },
      ],
    },
  }),
}))

it('keeps item facts and shows its captured bonus with a plain type', () => {
  render(<ItemHoverContent itemId={7631} />)
  expect(screen.getByText('Stolen Necklace (Level 25)')).toBeInTheDocument()
  expect(screen.getByText('+8')).toHaveClass('detail-value-row__value')
  expect(screen.getByText('Enhancement')).toHaveClass('detail-value-row__type')
})

it('shows a damage row when an item detail carries a captured dice modifier', () => {
  hasItemDamage = true
  render(<ItemHoverContent itemId={7631} />)
  expect(screen.getByText('1d6 Electric')).toHaveClass('detail-value-row__value')
})

it('shows the captured augment bonuses and dice as separate rows', () => {
  render(<AugmentHoverContent augmentId={77} />)
  expect(screen.getByText(/Martial: Shocking Burst/)).toBeInTheDocument()
  expect(screen.getByText('Insight')).toHaveClass('detail-type-tag')
  expect(screen.getByText('1d6 Electric')).toHaveClass('detail-value-row__value')
  expect(screen.queryByText('1d10 Electric')).toBeNull()
  expect(screen.getByText(/crafting: alchemical tier 1/)).toBeInTheDocument()
})

it.each([
  [
    'adventurePack',
    'Adventure pack',
    2,
    'Magic of Myth Drannor',
    'Bastard Sword of the Fallen Age',
  ],
  ['questChain', 'Quest chain', 1, 'The Lost Seekers', "Acrobat's Ring"],
  ['saga', 'Saga', 1, 'The Haunting of Saltmarsh', 'Black Pearl Ring'],
  ['craftingSystem', 'Crafting system', 1, 'Slave Lords Crafting', 'Strength +5'],
  ['vendor', 'Vendor', 1, 'Morten Edgewright', 'Epic Ethereal Bastard Sword'],
  ['event', 'Event', 1, 'Treasure of Crystal Cove', "Admiral's Tricorne"],
] as const)('shows a %s source card with its yields', (kind, label, id, name, yieldName) => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <SourceHoverAnchor kind={kind} id={id} name={name}>
        {name}
      </SourceHoverAnchor>
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText(name))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card.querySelector('.hover-card__status .section-label')).toHaveTextContent(label)
  expect(card).toHaveAttribute('data-kind', kind)
  expect(card).toHaveTextContent(name)
  expect(card).toHaveTextContent(yieldName)
  expect(card.querySelector('.resources-hover-row')).toHaveClass('hover-card-row')
})

it('opens an item yielded by a pack', () => {
  vi.useFakeTimers()
  const openItem = vi.fn()
  render(
    <HoverCardProvider>
      <SourceHoverAnchor
        kind="adventurePack"
        id={2}
        name="Magic of Myth Drannor"
        onOpenItem={openItem}
      >
        Pack
      </SourceHoverAnchor>
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Pack'))
  act(() => vi.advanceTimersByTime(120))
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: /Bastard Sword of the Fallen Age/,
    }),
  )
  expect(openItem).toHaveBeenCalledWith(794, 'Bastard Sword of the Fallen Age')
})

it.each([
  ['challengePack', 5, 'Vaults of the Artificers'],
  ['starter', null, 'Starter gear at level 15'],
] as const)('shows a hint card for %s without requesting source detail', (kind, id, name) => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <SourceHoverAnchor kind={kind} id={id} name={name}>
        Source
      </SourceHoverAnchor>
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Source'))
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getByRole('tooltip')).toHaveTextContent(name)
  expect(within(screen.getByRole('tooltip')).getByRole('link')).toBeInTheDocument()
})

afterEach(() => {
  cleanup()
  hasItemDamage = false
  vi.useRealTimers()
})

it('shows a quest’s pack, raid flag, and unique loot item, then opens that item', () => {
  vi.useFakeTimers()
  const openItem = vi.fn()
  render(
    <HoverCardProvider>
      <QuestHoverAnchor questId={7} onOpenItem={openItem}>
        Quest
      </QuestHoverAnchor>
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Quest'))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent('The Storm')
  expect(card).toHaveTextContent('Storm Pack · Raid')
  expect(within(card).getAllByText('Storm Blade')).toHaveLength(1)
  expect(card.querySelector('.resources-hover-row')).toHaveClass('hover-card-row')
  fireEvent.click(within(card).getByRole('button', { name: /Storm Blade/ }))
  expect(openItem).toHaveBeenCalledWith(11, 'Storm Blade')
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('shows set pieces and tier bonuses', () => {
  vi.useFakeTimers()
  const openItem = vi.fn()
  render(
    <HoverCardProvider>
      <SetHoverAnchor setId={3} name="Storm Set" onOpenItem={openItem} />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Storm Set'))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent('1 piece')
  expect(card).toHaveTextContent('2 pieces')
  expect(card).toHaveTextContent('Fire Spell Power')
  expect(card).toHaveTextContent('Storm tier unlock')
  expect(card.querySelector('.resources-set-tier')).toHaveClass('hover-card-row')
  fireEvent.click(within(card).getByRole('button', { name: /Storm Blade/ }))
  expect(openItem).toHaveBeenCalledWith(11, 'Storm Blade')
  expect(screen.queryByRole('dialog')).toBeNull()
})
