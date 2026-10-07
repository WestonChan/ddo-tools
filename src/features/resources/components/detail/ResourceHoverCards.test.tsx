import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { render } from '../../../../test/renderWithQueryClient'
import { afterEach, expect, it, vi } from 'vitest'
import type { JSX } from 'react'
import { HoverCardProvider } from '../../../../components'
import {
  QuestHoverAnchor,
  SourceHoverAnchor,
  AugmentDetailCard,
  AugmentHoverCard,
  ItemHoverContent,
  SetDetailCard,
  SetHoverCard,
  QuestDetailCard,
  QuestHoverCard,
  SourceDetailCard,
  SourceHoverCard,
} from './ResourceHoverCards'
import { BonusDetailCard, BonusHoverCard } from './BonusDetailCard'
import { EffectListFullView } from './EffectList'
import { setEffectRows } from './effectRows'
import capturedItem from '../../queries/fixtures/effects-item.json'
import capturedRing from '../../queries/fixtures/effects-item-487.json'
import adventurePack from '../../queries/fixtures/adventure-packs.json'
import questChain from '../../queries/fixtures/quest-chains.json'
import saga from '../../queries/fixtures/sagas.json'
import craftingSystem from '../../queries/fixtures/crafting-systems.json'
import vendor from '../../queries/fixtures/vendors.json'
import event from '../../queries/fixtures/events.json'
import augment from '../../queries/fixtures/effects-augment-77.json'
import capturedAugment from '../../queries/fixtures/effects-augment.json'
import groupedAugment from '../../queries/fixtures/effects-augment-633.json'
import capturedSet from '../../queries/fixtures/effects-set.json'
import riposteDetail from '../../queries/fixtures/effect-detail-384.json'
import groupDetail from '../../queries/fixtures/effect-detail-336.json'
import charismaDetail from '../../queries/fixtures/effect-detail-6.json'
import { readFileSync } from 'node:fs'
import {
  ApiError,
  API_RESPONSE_ERROR,
  type ApiAugmentDetail,
  type ApiEffect,
  type ApiItemDetail,
  type ApiSetDetail,
} from '../../../../lib/api'
import { toAugmentDetail, toItem } from '../../queries/items'
import { ItemDetailCard, ItemHoverCard } from './ItemDetailCard'
import { toSetDetail } from '../../queries/sets'
import {
  toAdventurePack,
  toQuestChain,
  toSaga,
  toCraftingSystem,
  toVendor,
  toEvent,
} from '../../queries/sources'

function cardForVariant(
  variant: 'pane' | 'hover',
  pane: JSX.Element,
  hover: JSX.Element,
): JSX.Element {
  return new Map([
    ['pane', pane],
    ['hover', hover],
  ]).get(variant)!
}

const navigateMock = vi.fn()
let hasItemDamage = false
let hasItemEffectInAugment = false
let failedHoverKind: 'item' | 'augment' | 'set' | 'quest' | 'source' | 'effect' | null = null
let pendingHoverKind: 'item' | 'augment' | 'set' | 'quest' | 'source' | 'effect' | null = null
let effectVocabularyDetail: typeof riposteDetail | typeof groupDetail | typeof charismaDetail =
  riposteDetail
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }))
vi.mock('../../queries/useItems', () => ({
  isItemCardReady: () => pendingHoverKind !== 'item',
  isEffectReady: () => pendingHoverKind !== 'effect',
  isDetailQueryReady: (_queryClient: unknown, detailQuery: { queryKey: string[] }) => {
    const kind = detailQuery.queryKey[0]
    return (
      (kind !== 'sets' || pendingHoverKind !== 'set') &&
      (kind !== 'quests' || pendingHoverKind !== 'quest') &&
      (kind !== 'sources' || pendingHoverKind !== 'source')
    )
  },
  setDetailQueryOptions: (id: number) => ({
    queryKey: ['sets', 'detail', id],
    queryFn: () => new Promise(() => {}),
  }),
  questDetailQueryOptions: (id: number) => ({
    queryKey: ['quests', 'detail', id],
    queryFn: () => new Promise(() => {}),
  }),
  sourceDetailQueryOptions: (kind: string, id: number) => ({
    queryKey: ['sources', kind, id],
    queryFn: () => new Promise(() => {}),
  }),
  useItem: () => ({
    isPending: pendingHoverKind === 'item',
    error:
      failedHoverKind === 'item'
        ? new ApiError(API_RESPONSE_ERROR, 0, 'Invalid /v1/items/7631: body')
        : null,
    refetch: vi.fn(),
    data:
      pendingHoverKind === 'item' || failedHoverKind === 'item'
        ? undefined
        : toItem({
            ...(capturedItem as ApiItemDetail),
            modifiers: hasItemDamage ? [augment.modifiers[0]] : [],
          }),
  }),
  useAugment: () => ({
    isPending: pendingHoverKind === 'augment',
    error:
      failedHoverKind === 'augment'
        ? new ApiError(API_RESPONSE_ERROR, 0, 'Invalid /v1/augments/77: body')
        : null,
    refetch: vi.fn(),
    data:
      pendingHoverKind === 'augment' || failedHoverKind === 'augment'
        ? undefined
        : toAugmentDetail({
            ...(capturedAugment as ApiAugmentDetail),
            effects: (hasItemEffectInAugment
              ? [capturedItem.effects[0]]
              : capturedAugment.effects) as ApiEffect[],
            modifiers: augment.modifiers,
          }),
  }),
  useFittingAugmentsBySlotLabel: () => ({ data: [], isPending: false, error: null }),
  useAdventurePack: () => ({
    isPending: pendingHoverKind === 'source',
    data:
      failedHoverKind === 'source' || pendingHoverKind === 'source'
        ? undefined
        : toAdventurePack(adventurePack),
    error:
      failedHoverKind === 'source'
        ? new ApiError(API_RESPONSE_ERROR, 0, 'Invalid /v1/adventure-packs/2: items')
        : null,
    refetch: vi.fn(),
  }),
  useQuestChain: () => ({
    isPending: pendingHoverKind === 'source',
    data: pendingHoverKind === 'source' ? undefined : toQuestChain(questChain),
  }),
  useSaga: () => ({
    isPending: pendingHoverKind === 'source',
    data: pendingHoverKind === 'source' ? undefined : toSaga(saga),
  }),
  useCraftingSystem: () => ({
    isPending: pendingHoverKind === 'source',
    data: pendingHoverKind === 'source' ? undefined : toCraftingSystem(craftingSystem),
  }),
  useVendor: () => ({
    isPending: pendingHoverKind === 'source',
    data: pendingHoverKind === 'source' ? undefined : toVendor(vendor),
  }),
  useEvent: () => ({
    isPending: pendingHoverKind === 'source',
    data: pendingHoverKind === 'source' ? undefined : toEvent(event),
  }),
  useQuest: () => ({
    isPending: pendingHoverKind === 'quest',
    error:
      failedHoverKind === 'quest'
        ? new ApiError(API_RESPONSE_ERROR, 0, 'Invalid /v1/quests/7: items')
        : null,
    refetch: vi.fn(),
    data:
      failedHoverKind === 'quest' || pendingHoverKind === 'quest'
        ? undefined
        : {
            id: 7,
            name: 'The Storm',
            pack: 'Storm Pack',
            patron: 'House Storm',
            level: 10,
            epicLevel: 30,
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
  useEffectDetail: () => ({
    isPending: pendingHoverKind === 'effect',
    error:
      failedHoverKind === 'effect'
        ? new ApiError(API_RESPONSE_ERROR, 0, 'Invalid response for /v1/effects/384: body')
        : null,
    refetch: vi.fn(),
    data:
      failedHoverKind === 'effect' || pendingHoverKind === 'effect'
        ? undefined
        : effectVocabularyDetail,
  }),
  useSet: (setId: number | null) => ({
    isPending: pendingHoverKind === 'set',
    error:
      failedHoverKind === 'set'
        ? new ApiError(
            API_RESPONSE_ERROR,
            0,
            `Invalid response for /v1/sets/${setId}: tiers[0].effects`,
          )
        : null,
    refetch: vi.fn(),
    data:
      failedHoverKind === 'set' || pendingHoverKind === 'set'
        ? undefined
        : toSetDetail(capturedSet as ApiSetDetail),
  }),
}))

it('renders each effect stat in its own hover row', () => {
  render(<BonusHoverCard detailPath="/v1/effects/384" />)
  const armorRow = screen.getByText('Armor Class').closest('.hover-card-row')
  const savesRow = screen.getByText('Saving Throws').closest('.hover-card-row')
  expect(armorRow).not.toBeNull()
  expect(savesRow).not.toBeNull()
  expect(armorRow).not.toBe(savesRow)
})

it('labels a group and lists its member stats in separate hover rows', () => {
  effectVocabularyDetail = groupDetail
  render(<BonusHoverCard detailPath="/v1/effects/336" />)
  expect(screen.getByText('Group')).toBeInTheDocument()
  const bluffRow = screen.getByText('Bluff').closest('.hover-card-row')
  const diplomacyRow = screen.getByText('Diplomacy').closest('.hover-card-row')
  expect(bluffRow).not.toBeNull()
  expect(diplomacyRow).not.toBeNull()
  expect(bluffRow).not.toBe(diplomacyRow)
})

it('does not repeat a grouped bonus value and type beneath its facts', () => {
  const effect = toAugmentDetail(groupedAugment as ApiAugmentDetail).effects[0]
  render(<BonusHoverCard effect={effect} />)
  const groupRow = screen.getByText('Charisma Skills').closest('.hover-card-row')
  expect(groupRow).toHaveTextContent('Charisma Skills')
  expect(groupRow).not.toHaveTextContent('Exceptional')
  expect(groupRow).not.toHaveTextContent('+6')
  expect(screen.getByText('Bluff')).toBeInTheDocument()
})

it('keeps item facts and shows its captured effect name with a plain type', () => {
  render(<ItemHoverContent itemId={7631} />)
  expect(screen.getByText('Stolen Necklace (Level 25)')).toBeInTheDocument()
  expect(screen.getByText('Charisma')).toBeInTheDocument()
  expect(screen.getByText('+8')).toHaveClass('detail-value-row__value')
  expect(screen.getByText('Enhancement')).toHaveClass('detail-value-row__type')
})

it('does not add modifier-only damage rows that the pane does not show', () => {
  hasItemDamage = true
  render(<ItemHoverContent itemId={7631} />)
  expect(screen.queryByText('1d6 Electric')).toBeNull()
})

it('shows the captured augment effect and dice as separate rows', () => {
  render(<AugmentHoverCard augmentId={77} />)
  expect(screen.getByText(/Solar Gem of Physical Resistance Rating/)).toBeInTheDocument()
  expect(screen.getByText('Artifact')).toHaveClass('detail-type-tag')
  expect(screen.getByText('1d6 Electric')).toHaveClass('detail-value-row__value')
  expect(screen.queryByText('1d10 Electric')).toBeNull()
  expect(screen.getByLabelText('Sun slot')).toHaveClass('augment-slot-symbol--sun')
  expect(screen.queryByRole('button', { name: 'Sun slot' })).toBeNull()
})

it('shows an augment effect verbose name before its stat rows on nested hover', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <AugmentHoverCard augmentId={77} />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(
    screen.getByText('Physical Resistance Rating').closest('.resources-hover-effect-row')!,
  )
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  const verboseName = within(card).getByText('Artifact Physical Resistance Rating +10')
  const statRow = card.querySelector('.detail-value-row__label')!
  expect(card.querySelector('.detail-card__name')!.compareDocumentPosition(verboseName) & 4).toBe(4)
  expect(verboseName.compareDocumentPosition(statRow) & 4).toBe(4)
})

it('shows a captured set effect verbose name before its stat rows on nested hover', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <SetHoverCard setId={6} />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(
    screen.getByText('Positive Spell Power').closest('.resources-hover-effect-row')!,
  )
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  const verboseName = within(card).getByText('Equipment Positive Spell Power +36')
  const statRow = card.querySelector('.detail-card__section .hover-card-row')!
  expect(card.querySelector('.detail-card__name')!.compareDocumentPosition(verboseName) & 4).toBe(4)
  expect(verboseName.compareDocumentPosition(statRow) & 4).toBe(4)
})

const sectionKeysByKind: Record<string, string[]> = {
  item: ['description', 'stats', 'enchantments', 'sources'],
  augment: ['enchantments', 'damage', 'description'],
  bonus: ['stats', 'found-on'],
  quest: ['drops'],
  set: ['pieces', 'set-bonuses'],
  adventurePack: ['items'],
  questChain: ['quests', 'items'],
  saga: ['quests', 'items'],
  craftingSystem: ['recipes'],
  vendor: ['items'],
  event: ['items'],
}

it('keeps all five item fact values equal when the item belongs to a set', () => {
  const item = toItem(capturedRing as ApiItemDetail)
  const pane = render(<ItemDetailCard item={item} />)
  const paneValues = [...pane.container.querySelectorAll('.detail-card__fact > div')].map(
    (fact) => fact.textContent,
  )
  expect(paneValues).toHaveLength(5)
  expect(paneValues[4]).toBe('Y')
  pane.unmount()
  const hover = render(<ItemHoverCard item={item} />)
  expect(
    [...hover.container.querySelectorAll('.detail-card__fact > div')].map(
      (fact) => fact.textContent,
    ),
  ).toEqual(paneValues)
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
  expect(card.querySelector('.detail-card__kicker-row .section-label')).toHaveTextContent(label)
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
  hasItemEffectInAugment = false
  failedHoverKind = null
  pendingHoverKind = null
  effectVocabularyDetail = riposteDetail
  vi.useRealTimers()
})

it('keeps embedded bonus details under an empty kicker until its kind arrives', () => {
  const effect = toItem(capturedItem as ApiItemDetail).effects[0]
  effectVocabularyDetail = charismaDetail
  pendingHoverKind = 'effect'
  const view = render(<BonusHoverCard effect={effect} />)
  const kicker = view.container.querySelector('.detail-card__kicker-row')!
  expect(kicker.textContent).toBe('')
  expect(kicker.querySelector('.section-label')).toBeInTheDocument()
  expect(view.container.querySelector('.detail-card__name')).toHaveTextContent('Charisma')
  expect(view.container.querySelector('.detail-card__facts')).toHaveTextContent('Value+8')
  expect(view.container.querySelector('.detail-card__body')).toHaveTextContent('Enhancement')
  expect(readFileSync('src/components/DetailCard/DetailCard.css', 'utf8')).toMatch(
    /\.detail-card--hover\s*\{[^}]*--detail-card-kicker-row-height:\s*var\(--space-4\)/,
  )

  pendingHoverKind = null
  view.rerender(<BonusHoverCard effect={effect} />)
  expect(kicker).toHaveTextContent('Stat')
  expect(view.container.querySelector('.detail-card__facts')).toHaveTextContent('Value+8')
})

it('keeps a bonus without embedded data in the shared loading shell', () => {
  pendingHoverKind = 'effect'
  const { container } = render(<BonusHoverCard detailPath="/v1/effects/384" />)
  expect(container.querySelector('.detail-card__kicker-row')?.textContent).toBe('')
  expect(
    [...container.querySelectorAll('.detail-card__fact .section-label')].map(
      (label) => label.textContent,
    ),
  ).toEqual(['Type', 'Value', 'Tier'])
  expect(container.querySelector('.detail-card__body')).toHaveTextContent('Loading bonus…')
})

it('keeps a related set error in the item card section list', () => {
  failedHoverKind = 'set'
  render(<ItemHoverContent itemId={7631} />)
  expect(
    screen.getByText('Something went wrong on our side.').closest('.detail-card__body'),
  ).toBeInTheDocument()
})

it.each([
  [
    'item',
    () => <ItemHoverContent itemId={7631} />,
    ['ML', 'Gear slot', 'Raid', 'Rare', 'Augments'],
  ],
  ['augment', () => <AugmentHoverCard augmentId={77} />, ['ML', 'Slots']],
  ['quest', () => <QuestHoverCard questId={7} />, ['Level', 'Pack', 'Patron', 'Raid']],
  ['set', () => <SetHoverCard setId={6} />, ['Pieces', 'Bonus tiers']],
] as const)('keeps the %s loading state inside its detail shell', (kind, card, factLabels) => {
  pendingHoverKind = kind
  const { container } = render(card())
  expect(container.querySelector('.detail-card__header')).toBeInTheDocument()
  expect(
    [...container.querySelectorAll('.detail-card__fact .section-label')].map(
      (label) => label.textContent,
    ),
  ).toEqual(factLabels)
  expect(container.querySelector('.detail-card__body')).toHaveTextContent(/Loading/)
})

it.each([
  ['item', () => <ItemHoverContent itemId={7631} />],
  ['augment', () => <AugmentHoverCard augmentId={77} />],
  ['quest', () => <QuestHoverCard questId={7} />],
  ['set', () => <SetHoverCard setId={6} />],
  ['effect', () => <BonusHoverCard detailPath="/v1/effects/384" />],
] as const)('keeps the %s error inside its detail shell', (kind, card) => {
  failedHoverKind = kind
  const { container } = render(card())
  expect(container.querySelector('.detail-card__header')).toBeInTheDocument()
  expect(container.querySelector('.detail-card__body')).toHaveTextContent(
    'Something went wrong on our side.',
  )
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
})

it.each([
  ['adventurePack', 'Magic of Myth Drannor', ['Free to play']],
  ['questChain', 'The Lost Seekers', ['Pack']],
  ['saga', 'A Saga', ['Pack']],
  ['craftingSystem', 'Crafting', ['Pack', 'NPC', 'Ingredients']],
  ['vendor', 'Vendor', ['Pack', 'Location']],
  ['event', 'Event', ['Items']],
] as const)('keeps %s loading inside a labelled source shell', (kind, name, factLabels) => {
  vi.useFakeTimers()
  pendingHoverKind = 'source'
  render(
    <HoverCardProvider>
      <SourceHoverAnchor kind={kind} id={2} name={name}>
        {name}
      </SourceHoverAnchor>
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText(name))
  act(() => vi.advanceTimersByTime(720))
  const card = screen.getByRole('dialog')
  expect(card.querySelector('.detail-card__header')).toBeInTheDocument()
  expect(
    [...card.querySelectorAll('.detail-card__fact .section-label')].map(
      (label) => label.textContent,
    ),
  ).toEqual(factLabels)
  expect(card.querySelector('.detail-card__body')).toHaveTextContent('Loading source…')
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
  expect(card.querySelector('.detail-card__kicker-row')).toHaveTextContent('Raid')
  expect(card.querySelector('.detail-card__facts')).toHaveTextContent('Level10 / 30')
  expect(card.querySelector('.detail-card__facts')).toHaveTextContent('PackStorm Pack')
  expect(card.querySelector('.detail-card__facts')).toHaveTextContent('PatronHouse Storm')
  expect(within(card).getAllByText('Storm Blade')).toHaveLength(1)
  expect(card.querySelector('.resources-hover-row')).toHaveClass('hover-card-row')
  fireEvent.click(within(card).getByRole('button', { name: /Storm Blade/ }))
  expect(openItem).toHaveBeenCalledWith(11, 'Storm Blade')
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('shows captured set pieces and tier bonuses', () => {
  vi.useFakeTimers()
  const openItem = vi.fn()
  const setDetail = toSetDetail(capturedSet as ApiSetDetail)
  render(
    <HoverCardProvider>
      <EffectListFullView entries={setEffectRows(setDetail, [], openItem)} />
    </HoverCardProvider>,
  )
  const setBand = screen.getByRole('row', { name: /Devoted Heart/ })
  fireEvent.mouseEnter(setBand)
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent('2 pieces')
  expect(card).toHaveTextContent('Positive Spell Power')
  expect(card.querySelector('.resources-set-tier')).toHaveClass('hover-card-row')
  fireEvent.click(within(card).getByRole('button', { name: /Devoted Goggles/ }))
  expect(openItem).toHaveBeenCalledWith(1815, 'Devoted Goggles')
  expect(screen.queryByRole('dialog')).toBeNull()

  fireEvent.keyDown(document, { key: 'Tab' })
  act(() => setBand.focus())
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.keyDown(setBand, { key: 'Escape' })
  expect(setBand).toHaveFocus()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it.each(['set', 'quest', 'source'] as const)(
  'shows an actionable error in a failed %s hover card',
  (kind) => {
    vi.useFakeTimers()
    failedHoverKind = kind
    render(
      <HoverCardProvider>
        {kind === 'set' ? (
          <EffectListFullView entries={setEffectRows(toSetDetail(capturedSet as ApiSetDetail))} />
        ) : kind === 'quest' ? (
          <QuestHoverAnchor questId={7}>Quest</QuestHoverAnchor>
        ) : (
          <SourceHoverAnchor kind="adventurePack" id={2} name="Magic of Myth Drannor">
            Source
          </SourceHoverAnchor>
        )}
      </HoverCardProvider>,
    )
    fireEvent.mouseEnter(
      kind === 'set'
        ? screen.getByRole('row', { name: /Devoted Heart/ })
        : screen.getByText(kind === 'quest' ? 'Quest' : 'Source'),
    )
    act(() => vi.advanceTimersByTime(120))
    const card = within(screen.getByRole('dialog'))
    expect(
      card.getByText('Something went wrong on our side.').closest('.detail-card'),
    ).toBeInTheDocument()
    expect(card.getByText('Something went wrong on our side.')).toBeInTheDocument()
    expect(card.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(card.getByRole('link', { name: 'Report a bug' })).toBeInTheDocument()
  },
)

it('shows an actionable error in a failed bonus hover card', () => {
  failedHoverKind = 'effect'
  render(<BonusHoverCard detailPath="/v1/effects/384" />)
  expect(screen.getByText('Something went wrong on our side.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Report a bug' })).toBeInTheDocument()
  expect(screen.queryByText('Bonus unavailable')).toBeNull()
})

it.each([
  [
    'item',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <ItemDetailCard item={toItem(capturedItem as ApiItemDetail)} />,
        <ItemHoverCard item={toItem(capturedItem as ApiItemDetail)} />,
      ),
    ['ML', 'Gear slot', 'Raid', 'Rare', 'Augments'],
    ['Obtained from'],
  ],
  [
    'augment',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <AugmentDetailCard augmentId={77} />,
        <AugmentHoverCard augmentId={77} />,
      ),
    ['ML', 'Slots'],
    ['Enchantments', 'Damage', 'Description'],
  ],
  [
    'bonus',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <BonusDetailCard detailPath="/v1/effects/384" />,
        <BonusHoverCard detailPath="/v1/effects/384" />,
      ),
    ['Type', 'Value', 'Tier'],
    ['Stats', 'Found on'],
  ],
  [
    'quest',
    (variant: 'pane' | 'hover') =>
      cardForVariant(variant, <QuestDetailCard questId={7} />, <QuestHoverCard questId={7} />),
    ['Level', 'Pack', 'Patron', 'Raid'],
    ['Drops here'],
  ],
  [
    'set',
    (variant: 'pane' | 'hover') =>
      cardForVariant(variant, <SetDetailCard setId={6} />, <SetHoverCard setId={6} />),
    ['Pieces', 'Bonus tiers'],
    ['Pieces', 'Set bonuses'],
  ],
  [
    'adventurePack',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toAdventurePack(adventurePack)} />,
        <SourceHoverCard source={toAdventurePack(adventurePack)} />,
      ),
    ['Free to play'],
    ['Items'],
  ],
  [
    'questChain',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toQuestChain(questChain)} />,
        <SourceHoverCard source={toQuestChain(questChain)} />,
      ),
    ['Pack'],
    ['Quests', 'Rewards'],
  ],
  [
    'saga',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toSaga(saga)} />,
        <SourceHoverCard source={toSaga(saga)} />,
      ),
    ['Pack'],
    ['Quests', 'Rewards'],
  ],
  [
    'craftingSystem',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toCraftingSystem(craftingSystem)} />,
        <SourceHoverCard source={toCraftingSystem(craftingSystem)} />,
      ),
    ['Pack', 'NPC', 'Ingredients'],
    ['Recipes'],
  ],
  [
    'vendor',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toVendor(vendor)} />,
        <SourceHoverCard source={toVendor(vendor)} />,
      ),
    ['Pack', 'Location'],
    ['Items'],
  ],
  [
    'event',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toEvent(event)} />,
        <SourceHoverCard source={toEvent(event)} />,
      ),
    ['Items'],
    ['Items'],
  ],
] as const)(
  'keeps the %s section and fact contract in both variants',
  (kind, card, facts, sections) => {
    const pane = render(card('pane'))
    const paneCard = pane.container.querySelector('.detail-card')!
    expect(
      [...paneCard.querySelectorAll('.detail-card__facts .section-label')].map(
        (label) => label.textContent,
      ),
    ).toEqual(facts)
    expect(
      [...paneCard.querySelectorAll('.detail-card__section > .section-label')].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(sections)
    const paneFactValues = [...paneCard.querySelectorAll('.detail-card__fact > div')].map(
      (fact) => fact.textContent,
    )
    expect(
      [...paneCard.querySelectorAll('.detail-card__section')].map((section) =>
        section.getAttribute('data-section-key'),
      ),
    ).toEqual(sectionKeysByKind[kind])
    pane.unmount()
    const hover = render(card('hover'))
    const hoverCard = hover.container.querySelector('.detail-card')!
    expect(
      [...hoverCard.querySelectorAll('.detail-card__facts .section-label')].map(
        (label) => label.textContent,
      ),
    ).toEqual(facts)
    expect(
      [...hoverCard.querySelectorAll('.detail-card__section > .section-label')].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(sections)
    expect(
      [...hoverCard.querySelectorAll('.detail-card__fact > div')].map((fact) => fact.textContent),
    ).toEqual(paneFactValues)
    expect(
      [...hoverCard.querySelectorAll('.detail-card__section')].map((section) =>
        section.getAttribute('data-section-key'),
      ),
    ).toEqual(sectionKeysByKind[kind])
  },
)

const sectionEntryFields: Record<string, Record<string, string[]>> = {
  item: {
    description: [capturedItem.description],
    stats: ['Gold'],
    enchantments: ['Charisma', 'Enhancement', '+8'],
    sources: [
      'Friends in Low Places',
      'End chest',
      'Level 16 / 26',
      'Shadowfell Conspiracy',
      'Purple Dragon Knights',
      'Shadow Over Wheloon',
      'Chain end reward',
    ],
  },
  augment: {
    enchantments: ['Physical Resistance Rating', 'Artifact', '+10'],
    damage: ['Electric'],
    description: [capturedAugment.description],
  },
  bonus: {
    stats: ['Armor Class', 'Saving Throws'],
    'found-on': ['Items', '29', 'Augments', 'Set tiers'],
  },
  quest: { drops: ['Storm Blade', 'Main Hand', 'ML 20'] },
  set: {
    pieces: ['Devoted Goggles', 'Goggles', 'ML 1'],
    'set-bonuses': ['Positive Spell Power', 'Equipment', '+36'],
  },
  adventurePack: {
    items: ['Bastard Sword of the Fallen Age', 'Main Hand', 'ML 13', 'any end chest'],
  },
  questChain: {
    quests: ["The Kobold's Den: Clan Gnashtooth", 'Level 3'],
    items: ["Acrobat's Ring", 'Ring', 'ML 3'],
  },
  saga: {
    quests: ['Back to Basics', 'Level 3'],
    items: ['Black Pearl Ring', 'Ring', 'ML 29', 'epic'],
  },
  craftingSystem: { recipes: ['Attributes +5', 'Strength +5', 'Intelligence +5', 'Dexterity +5'] },
  vendor: { items: ['Epic Ethereal Bastard Sword', 'Main Hand', 'ML 20', '1 Epic Ethereal Ingot'] },
  event: { items: ["Admiral's Tricorne", 'Head', 'ML 1'] },
}

it.each([
  [
    'item',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <ItemDetailCard item={toItem(capturedItem as ApiItemDetail)} />,
        <ItemHoverCard item={toItem(capturedItem as ApiItemDetail)} />,
      ),
  ],
  [
    'augment',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <AugmentDetailCard augmentId={77} />,
        <AugmentHoverCard augmentId={77} />,
      ),
  ],
  [
    'bonus',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <BonusDetailCard detailPath="/v1/effects/384" />,
        <BonusHoverCard detailPath="/v1/effects/384" />,
      ),
  ],
  [
    'quest',
    (variant: 'pane' | 'hover') =>
      cardForVariant(variant, <QuestDetailCard questId={7} />, <QuestHoverCard questId={7} />),
  ],
  [
    'set',
    (variant: 'pane' | 'hover') =>
      cardForVariant(variant, <SetDetailCard setId={6} />, <SetHoverCard setId={6} />),
  ],
  [
    'adventurePack',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toAdventurePack(adventurePack)} />,
        <SourceHoverCard source={toAdventurePack(adventurePack)} />,
      ),
  ],
  [
    'questChain',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toQuestChain(questChain)} />,
        <SourceHoverCard source={toQuestChain(questChain)} />,
      ),
  ],
  [
    'saga',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toSaga(saga)} />,
        <SourceHoverCard source={toSaga(saga)} />,
      ),
  ],
  [
    'craftingSystem',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toCraftingSystem(craftingSystem)} />,
        <SourceHoverCard source={toCraftingSystem(craftingSystem)} />,
      ),
  ],
  [
    'vendor',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toVendor(vendor)} />,
        <SourceHoverCard source={toVendor(vendor)} />,
      ),
  ],
  [
    'event',
    (variant: 'pane' | 'hover') =>
      cardForVariant(
        variant,
        <SourceDetailCard source={toEvent(event)} />,
        <SourceHoverCard source={toEvent(event)} />,
      ),
  ],
] as const)('keeps every %s section entry field in both views', (kind, card) => {
  for (const variant of ['pane', 'hover'] as const) {
    const view = render(card(variant))
    const sections = [...view.container.querySelectorAll('.detail-card__section')]
    for (const [sectionKey, fields] of Object.entries(sectionEntryFields[kind])) {
      const section = sections.find(
        (candidate) => candidate.getAttribute('data-section-key') === sectionKey,
      )
      expect(section, `${kind} ${variant} ${sectionKey}`).toBeDefined()
      const statDetailsToggle = section?.querySelector<HTMLButtonElement>('.detail-stats__toggle')
      if (statDetailsToggle) fireEvent.click(statDetailsToggle)
      const showMoreButton = section?.querySelector<HTMLButtonElement>('.detail-card__more')
      if (showMoreButton) fireEvent.click(showMoreButton)
      for (const field of fields)
        expect(section?.textContent, `${kind} ${variant} ${sectionKey}: ${field}`).toContain(field)
    }
    view.unmount()
  }
})

it('opens one bonus card contract from an item table and an augment row', () => {
  vi.useFakeTimers()
  hasItemEffectInAugment = true
  const itemView = render(
    <HoverCardProvider>
      <ItemDetailCard item={toItem(capturedItem as ApiItemDetail)} />
    </HoverCardProvider>,
  )
  const itemRow = screen.getByRole('row', { name: /Charisma Enhancement \+8/ })
  fireEvent.mouseEnter(itemRow)
  act(() => vi.advanceTimersByTime(120))
  const itemBonusCard = screen.getByRole('dialog').querySelector('.detail-card')!
  const itemFacts = [...itemBonusCard.querySelectorAll('.detail-card__fact')].map(
    (fact) => fact.textContent,
  )
  const itemHeadings = [
    ...itemBonusCard.querySelectorAll('.detail-card__section > .section-label'),
  ].map((heading) => heading.textContent)
  itemView.unmount()

  render(
    <HoverCardProvider>
      <AugmentDetailCard augmentId={77} />
    </HoverCardProvider>,
  )
  const augmentRow = screen.getByText('Charisma').closest('.resources-hover-effect-row')!
  fireEvent.mouseEnter(augmentRow)
  act(() => vi.advanceTimersByTime(120))
  const augmentBonusCard = screen.getByRole('dialog').querySelector('.detail-card')!
  expect(
    [...augmentBonusCard.querySelectorAll('.detail-card__fact')].map((fact) => fact.textContent),
  ).toEqual(itemFacts)
  expect(
    [...augmentBonusCard.querySelectorAll('.detail-card__section > .section-label')].map(
      (heading) => heading.textContent,
    ),
  ).toEqual(itemHeadings)
  expect(augmentBonusCard.querySelector('.detail-card__body')?.textContent).toContain('Charisma')
})
