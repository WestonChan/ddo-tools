import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HoverCardProvider } from '../../../../components'
import {
  QuestHoverAnchor,
  SetHoverAnchor,
  SourceHoverAnchor,
  AugmentHoverContent,
  ItemHoverContent,
  EffectVocabularyHoverContent,
  SetHoverContent,
} from './ResourceHoverCards'
import capturedItem from '../../queries/fixtures/effects-item.json'
import adventurePack from '../../queries/fixtures/adventure-packs.json'
import questChain from '../../queries/fixtures/quest-chains.json'
import saga from '../../queries/fixtures/sagas.json'
import craftingSystem from '../../queries/fixtures/crafting-systems.json'
import vendor from '../../queries/fixtures/vendors.json'
import event from '../../queries/fixtures/events.json'
import augment from '../../queries/fixtures/effects-augment-77.json'
import capturedAugment from '../../queries/fixtures/effects-augment.json'
import capturedSet from '../../queries/fixtures/effects-set.json'
import riposteDetail from '../../queries/fixtures/effect-detail-384.json'
import groupDetail from '../../queries/fixtures/effect-detail-336.json'
import {
  ApiError,
  API_RESPONSE_ERROR,
  type ApiAugmentDetail,
  type ApiItemDetail,
  type ApiSetDetail,
} from '../../../../lib/api'
import { toAugmentDetail, toItem } from '../../queries/items'
import { toSetDetail } from '../../queries/sets'
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
let failedHoverKind: 'set' | 'quest' | 'source' | 'effect' | null = null
let effectVocabularyDetail: typeof riposteDetail | typeof groupDetail = riposteDetail
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }))
vi.mock('../../queries/useItems', () => ({
  useItem: () => ({
    isPending: false,
    data: toItem({
      ...(capturedItem as ApiItemDetail),
      modifiers: hasItemDamage ? [augment.modifiers[0]] : [],
    }),
  }),
  useAugment: () => ({
    isPending: false,
    data: toAugmentDetail({
      ...(capturedAugment as ApiAugmentDetail),
      modifiers: augment.modifiers,
    }),
  }),
  useFittingAugmentsBySlotLabel: () => ({ data: [], isPending: false, error: null }),
  useAdventurePack: () => ({
    isPending: false,
    data: failedHoverKind === 'source' ? undefined : toAdventurePack(adventurePack),
    error:
      failedHoverKind === 'source'
        ? new ApiError(API_RESPONSE_ERROR, 0, 'Invalid /v1/adventure-packs/2: items')
        : null,
    refetch: vi.fn(),
  }),
  useQuestChain: () => ({ isPending: false, data: toQuestChain(questChain) }),
  useSaga: () => ({ isPending: false, data: toSaga(saga) }),
  useCraftingSystem: () => ({ isPending: false, data: toCraftingSystem(craftingSystem) }),
  useVendor: () => ({ isPending: false, data: toVendor(vendor) }),
  useEvent: () => ({ isPending: false, data: toEvent(event) }),
  useQuest: () => ({
    isPending: false,
    error:
      failedHoverKind === 'quest'
        ? new ApiError(API_RESPONSE_ERROR, 0, 'Invalid /v1/quests/7: items')
        : null,
    refetch: vi.fn(),
    data:
      failedHoverKind === 'quest'
        ? undefined
        : {
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
  useEffectDetail: () => ({
    isPending: false,
    error:
      failedHoverKind === 'effect'
        ? new ApiError(API_RESPONSE_ERROR, 0, 'Invalid response for /v1/effects/384: body')
        : null,
    refetch: vi.fn(),
    data: failedHoverKind === 'effect' ? undefined : effectVocabularyDetail,
  }),
  useSet: () => ({
    isPending: false,
    error:
      failedHoverKind === 'set'
        ? new ApiError(API_RESPONSE_ERROR, 0, 'Invalid response for /v1/sets/3: tiers[0].effects')
        : null,
    refetch: vi.fn(),
    data: failedHoverKind === 'set' ? undefined : toSetDetail(capturedSet as ApiSetDetail),
  }),
}))

it('renders each effect stat in its own hover row', () => {
  render(<EffectVocabularyHoverContent detailPath="/v1/effects/384" />)
  const armorRow = screen.getByText('Armor Class').closest('.hover-card-row')
  const savesRow = screen.getByText('Saving Throws').closest('.hover-card-row')
  expect(armorRow).not.toBeNull()
  expect(savesRow).not.toBeNull()
  expect(armorRow).not.toBe(savesRow)
})

it('labels a group and lists its member stats in separate hover rows', () => {
  effectVocabularyDetail = groupDetail
  render(<EffectVocabularyHoverContent detailPath="/v1/effects/336" />)
  expect(screen.getByText('Group')).toBeInTheDocument()
  const bluffRow = screen.getByText('Bluff').closest('.hover-card-row')
  const diplomacyRow = screen.getByText('Diplomacy').closest('.hover-card-row')
  expect(bluffRow).not.toBeNull()
  expect(diplomacyRow).not.toBeNull()
  expect(bluffRow).not.toBe(diplomacyRow)
})

it('keeps item facts and shows its captured effect name with a plain type', () => {
  render(<ItemHoverContent itemId={7631} />)
  expect(screen.getByText('Stolen Necklace (Level 25)')).toBeInTheDocument()
  expect(screen.getByText('Charisma')).toBeInTheDocument()
  expect(screen.getByText('+8')).toHaveClass('detail-value-row__value')
  expect(screen.getByText('Enhancement')).toHaveClass('detail-value-row__type')
})

it('shows a damage row when an item detail carries a captured dice modifier', () => {
  hasItemDamage = true
  render(<ItemHoverContent itemId={7631} />)
  expect(screen.getByText('1d6 Electric')).toHaveClass('detail-value-row__value')
})

it('shows the captured augment effect and dice as separate rows', () => {
  render(<AugmentHoverContent augmentId={77} />)
  expect(screen.getByText(/Solar Gem of Physical Resistance Rating/)).toBeInTheDocument()
  expect(screen.getByText('Artifact')).toHaveClass('detail-type-tag')
  expect(screen.getByText('1d6 Electric')).toHaveClass('detail-value-row__value')
  expect(screen.queryByText('1d10 Electric')).toBeNull()
  expect(screen.getByText(/sun/)).toBeInTheDocument()
})

it('shows an augment effect verbose name before its stat rows on nested hover', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <AugmentHoverContent augmentId={77} />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(
    screen.getByText('Physical Resistance Rating').closest('.resources-hover-effect-row')!,
  )
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  const verboseName = within(card).getByText('Artifact Physical Resistance Rating +10')
  const statRow = card.querySelector('.detail-value-row__label')!
  expect(
    card.querySelector('.resources-hover-title')!.compareDocumentPosition(verboseName) & 4,
  ).toBe(4)
  expect(verboseName.compareDocumentPosition(statRow) & 4).toBe(4)
})

it('shows a captured set effect verbose name before its stat rows on nested hover', () => {
  vi.useFakeTimers()
  render(
    <HoverCardProvider>
      <SetHoverContent setId={6} />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(
    screen.getByText('Positive Spell Power').closest('.resources-hover-effect-row')!,
  )
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  const verboseName = within(card).getByText('Equipment Positive Spell Power +36')
  const statRow = card.querySelector('.resources-hover-fact.hover-card-row')!
  expect(
    card.querySelector('.resources-hover-title')!.compareDocumentPosition(verboseName) & 4,
  ).toBe(4)
  expect(verboseName.compareDocumentPosition(statRow) & 4).toBe(4)
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
  failedHoverKind = null
  effectVocabularyDetail = riposteDetail
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

it('shows captured set pieces and tier bonuses', () => {
  vi.useFakeTimers()
  const openItem = vi.fn()
  render(
    <HoverCardProvider>
      <SetHoverAnchor setId={6} name="Devoted Heart" onOpenItem={openItem} />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByText('Devoted Heart'))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent('2 pieces')
  expect(card).toHaveTextContent('Positive Spell Power')
  expect(card.querySelector('.resources-set-tier')).toHaveClass('hover-card-row')
  fireEvent.click(within(card).getByRole('button', { name: /Devoted Goggles/ }))
  expect(openItem).toHaveBeenCalledWith(1815, 'Devoted Goggles')
  expect(screen.queryByRole('dialog')).toBeNull()

  const setAnchor = screen.getByText('Devoted Heart')
  act(() => setAnchor.focus())
  act(() => vi.advanceTimersByTime(120))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.keyDown(setAnchor, { key: 'Escape' })
  expect(setAnchor).toHaveFocus()
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
          <SetHoverAnchor setId={3} name="Storm Set" />
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
      screen.getByText(kind === 'set' ? 'Storm Set' : kind === 'quest' ? 'Quest' : 'Source'),
    )
    act(() => vi.advanceTimersByTime(120))
    const card = within(screen.getByRole('dialog'))
    expect(card.getByText('Something went wrong on our side.')).toBeInTheDocument()
    expect(card.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(card.getByRole('link', { name: 'Report a bug' })).toBeInTheDocument()
  },
)

it('shows an actionable error in a failed bonus hover card', () => {
  failedHoverKind = 'effect'
  render(<EffectVocabularyHoverContent detailPath="/v1/effects/384" />)
  expect(screen.getByText('Something went wrong on our side.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Report a bug' })).toBeInTheDocument()
  expect(screen.queryByText('Bonus unavailable')).toBeNull()
})
