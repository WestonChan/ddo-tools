import type { JSX, ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ApiErrorNotice,
  AugmentSlotDisplay,
  StructuredDetailCard,
  detailCardSection,
  type DetailCardDefinition,
  type DetailCardFact,
  DetailValueRow,
  WikiLinkIcon,
  useClearHoverCards,
  useHoverCard,
} from '../../../../components'
import {
  useQuest,
  useSet,
  useAugment,
  useAdventurePack,
  useQuestChain,
  useSaga,
  useCraftingSystem,
  useVendor,
  useEvent,
} from '../../queries/useItems'
import type {
  SourceDetail,
  SourceDetailKind,
  SourceQuest,
  SourceRecipe,
} from '../../queries/sources'
import type { Effect } from '../../queries/items'
import type { SetTier } from '../../queries/sets'
import { effectDamageText, effectValue, damageExpression } from './structuredRows'
import { ItemHoverCard } from './ItemDetailCard'
import { useItemCardContent } from './useItemCardContent'
import { titleCasedSlotLabel } from './titleCasedSlotLabel'
import { BonusHoverCard } from './BonusDetailCard'
import { resourceStatusDefinition } from './resourceStatusDefinition'
import { DamageView, DescriptionView } from './ResourceCardViews'

type OpenItem = (id: number, name: string) => void

function useOpenItemFromCard(onOpenItem?: OpenItem): OpenItem {
  const navigate = useNavigate()
  const clearCards = useClearHoverCards()
  return (id, name) => {
    clearCards()
    if (onOpenItem) onOpenItem(id, name)
    else void navigate({ to: `/resources/items/${id}` })
  }
}

export function ItemHoverContent({
  itemId,
  onOpenItem,
}: {
  itemId: number
  onOpenItem?: OpenItem
}): JSX.Element {
  const openItem = useOpenItemFromCard(onOpenItem)
  const { item, setDetail, status } = useItemCardContent(itemId)
  return <ItemHoverCard item={item} setDetail={setDetail} onOpenItem={openItem} status={status} />
}

function useAugmentDetailDefinition(augmentId: number): DetailCardDefinition {
  const augmentQuery = useAugment(augmentId)
  if (augmentQuery.error || !augmentQuery.data)
    return resourceStatusDefinition({
      kicker: 'Augment',
      name: 'Augment',
      facts: augmentFacts(),
      status: augmentQuery.error ? (
        <ApiErrorNotice
          error={augmentQuery.error}
          path={`/v1/augments/${augmentId}`}
          missingResourceName="augment"
          onRetry={() => void augmentQuery.refetch()}
        />
      ) : augmentQuery.isPending ? (
        'Loading augment…'
      ) : (
        'Augment unavailable'
      ),
    })
  const augment = augmentQuery.data
  const facts = augmentFacts(augment)
  const damage = augment.modifiers.flatMap((modifier) => {
    const expression = damageExpression(modifier)
    return expression ? [expression] : []
  })
  const description = augment.effectDescription || augment.description
  const sections = [
    detailCardSection({
      key: 'enchantments',
      heading: 'Enchantments',
      entries: augment.effects.map((effect) => ({ effect, originName: augment.name })),
      FullView: AugmentEffectsView,
    }),
    detailCardSection({ key: 'damage', heading: 'Damage', entries: damage, FullView: DamageView }),
    detailCardSection({
      key: 'description',
      heading: 'Description',
      entries: description ? [description] : [],
      FullView: DescriptionView,
    }),
  ]
  return { kicker: 'Augment', name: augment.name, facts, sections }
}

function augmentFacts(
  augment?: NonNullable<ReturnType<typeof useAugment>['data']>,
): DetailCardFact[] {
  return [
    {
      label: 'ML',
      value:
        augment?.minimumLevel == null ? null : <span className="num">{augment.minimumLevel}</span>,
    },
    {
      label: 'Slots',
      value: augment?.slots.length ? (
        <span className="resources-augment-slot-display">
          {augment.slots.map((slot, index) => (
            <AugmentSlotDisplay
              key={`${slot}-${index}`}
              family={slot.toLowerCase().startsWith('isle of dread:') ? 'dino' : 'standard'}
              label={slot}
              name={titleCasedSlotLabel(slot)}
            />
          ))}
        </span>
      ) : null,
    },
  ]
}

export function AugmentDetailCard({ augmentId }: { augmentId: number }): JSX.Element {
  const definition = useAugmentDetailDefinition(augmentId)
  return <StructuredDetailCard variant="pane" {...definition} />
}

export function AugmentHoverCard({ augmentId }: { augmentId: number }): JSX.Element {
  const definition = useAugmentDetailDefinition(augmentId)
  return <StructuredDetailCard variant="hover" {...definition} />
}

function AugmentEffectsView({
  entries,
}: {
  entries: readonly { effect: Effect; originName: string }[]
}): JSX.Element {
  return (
    <>
      {entries.map(({ effect, originName }) => (
        <AugmentEffectRow
          key={`${effect.id}-${effect.sortOrder}`}
          effect={effect}
          originName={originName}
        />
      ))}
    </>
  )
}

function AugmentEffectRow({
  effect,
  originName,
}: {
  effect: Effect
  originName: string
}): JSX.Element {
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    isRow: true,
    render: () => <BonusHoverCard effect={effect} originName={originName} />,
  })
  return (
    <div className="resources-hover-effect-row" tabIndex={0} {...anchor}>
      <DetailValueRow
        label={effect.name}
        value={effectValue(effect) ?? ''}
        type={effect.bonusType}
        typePresentation="tag"
        className="hover-card-row"
      />
      {effect.damage.map((damage, index) => (
        <span key={index} className="resources-effect-damage">
          {effectDamageText(damage)}
        </span>
      ))}
    </div>
  )
}

export function QuestHoverAnchor({
  questId,
  onOpenItem,
  children,
}: {
  questId: number
  onOpenItem?: OpenItem
  children: ReactNode
}): JSX.Element {
  const anchor = useHoverCard({
    kind: 'quest',
    delayMs: 120,
    render: () => <QuestHoverCard questId={questId} onOpenItem={onOpenItem} />,
  })
  return (
    <span className="resources-hover-anchor" tabIndex={0} {...anchor}>
      {children}
    </span>
  )
}

function useQuestDetailDefinition({
  questId,
  onOpenItem,
}: {
  questId: number
  onOpenItem?: OpenItem
}): DetailCardDefinition {
  const openItem = useOpenItemFromCard(onOpenItem)
  const questQuery = useQuest(questId)
  if (questQuery.error || !questQuery.data)
    return resourceStatusDefinition({
      kicker: 'Quest',
      name: 'Quest',
      facts: questFacts(),
      status: questQuery.error ? (
        <ApiErrorNotice
          error={questQuery.error}
          path={`/v1/quests/${questId}`}
          missingResourceName="quest"
          onRetry={() => void questQuery.refetch()}
        />
      ) : questQuery.isPending ? (
        'Loading quest…'
      ) : (
        'Quest unavailable'
      ),
    })
  const quest = questQuery.data
  const uniqueItems = [...new Map(quest.items.map((item) => [item.id, item])).values()]
  const facts = questFacts(quest)
  const sections = [
    detailCardSection({
      key: 'drops',
      heading: 'Drops here',
      entries: uniqueItems.map((item) => ({ ...item, onOpenItem: openItem })),
      FullView: LinkedItemsView,
      briefEntryLimit: 5,
    }),
  ]
  return { kicker: quest.isRaid ? 'Raid' : 'Quest', name: quest.name, facts, sections }
}

function questFacts(quest?: NonNullable<ReturnType<typeof useQuest>['data']>): DetailCardFact[] {
  const levels = [quest?.level, quest?.epicLevel].filter((level): level is number => level != null)
  return [
    { label: 'Level', value: levels.length > 0 ? levels.join(' / ') : null },
    { label: 'Pack', value: quest?.pack },
    { label: 'Patron', value: quest?.patron },
    { label: 'Raid', value: quest?.isRaid ? 'Yes' : null },
  ]
}

export function QuestDetailCard(props: { questId: number; onOpenItem?: OpenItem }): JSX.Element {
  const definition = useQuestDetailDefinition(props)
  return <StructuredDetailCard variant="pane" {...definition} />
}

export function QuestHoverCard(props: { questId: number; onOpenItem?: OpenItem }): JSX.Element {
  const definition = useQuestDetailDefinition(props)
  return <StructuredDetailCard variant="hover" {...definition} />
}

type LinkedItem = {
  id: number
  name: string
  slot: string
  minimumLevel?: number | null
  isRareLoot?: boolean
  chest?: string | null
  cost?: string | null
  tier?: string | null
  pack?: string | null
  onOpenItem: OpenItem
}

function LinkedItemsView({ entries }: { entries: readonly LinkedItem[] }): JSX.Element {
  return (
    <div className="resources-hover-rows">
      {entries.map((item) => (
        <LinkedItemRow key={item.id} {...item} />
      ))}
    </div>
  )
}

function LinkedItemRow({
  id,
  name,
  slot,
  minimumLevel,
  isRareLoot,
  chest,
  cost,
  tier,
  pack,
  onOpenItem,
}: LinkedItem): JSX.Element {
  const anchor = useHoverCard({
    kind: 'item',
    delayMs: 120,
    isRow: true,
    render: () => <ItemHoverContent itemId={id} onOpenItem={onOpenItem} />,
  })
  return (
    <button
      type="button"
      className="resources-hover-row hover-card-row"
      onClick={() => onOpenItem(id, name)}
      {...anchor}
    >
      <span>{name}</span>
      <span>{slot}</span>
      {((minimumLevel !== undefined && minimumLevel !== null) ||
        isRareLoot ||
        chest ||
        cost ||
        tier ||
        pack) && (
        <span className="resources-source-item-details">
          {[
            minimumLevel !== undefined && minimumLevel !== null ? `ML ${minimumLevel}` : null,
            chest,
            isRareLoot ? 'Rare' : null,
            cost,
            tier,
            pack,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      )}
    </button>
  )
}

export type SourceHoverKind = SourceDetailKind | 'challengePack' | 'starter'

const SOURCE_CARD_LABELS: Record<SourceDetailKind, string> = {
  adventurePack: 'Adventure pack',
  questChain: 'Quest chain',
  saga: 'Saga',
  craftingSystem: 'Crafting system',
  vendor: 'Vendor',
  event: 'Event',
}

export function SourceHoverAnchor({
  kind,
  id,
  name,
  wikiUrl,
  onOpenItem,
  children,
}: {
  kind: SourceHoverKind
  id: number | null
  name: string
  wikiUrl?: string | null
  onOpenItem?: OpenItem
  children: ReactNode
}): JSX.Element {
  const isHint = kind === 'challengePack' || kind === 'starter' || id === null
  const anchor = useHoverCard({
    kind: isHint ? 'hint' : kind,
    delayMs: 120,
    render: () =>
      isHint ? (
        <span className="resources-source-hint">
          <strong>{name}</strong>
          <WikiLinkIcon href={wikiUrl ?? undefined} pageName={name} />
        </span>
      ) : (
        <SourceHoverContent kind={kind} id={id} name={name} onOpenItem={onOpenItem} />
      ),
  })
  return (
    <span className="resources-hover-anchor" tabIndex={0} {...anchor}>
      {children}
    </span>
  )
}

function SourceHoverContent({
  kind,
  id,
  name,
  onOpenItem,
}: {
  kind: SourceDetailKind
  id: number
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  switch (kind) {
    case 'adventurePack':
      return <AdventurePackHoverContent id={id} name={name} onOpenItem={onOpenItem} />
    case 'questChain':
      return <QuestChainHoverContent id={id} name={name} onOpenItem={onOpenItem} />
    case 'saga':
      return <SagaHoverContent id={id} name={name} onOpenItem={onOpenItem} />
    case 'craftingSystem':
      return <CraftingSystemHoverContent id={id} name={name} onOpenItem={onOpenItem} />
    case 'vendor':
      return <VendorHoverContent id={id} name={name} onOpenItem={onOpenItem} />
    case 'event':
      return <EventHoverContent id={id} name={name} onOpenItem={onOpenItem} />
  }
}

function LoadedSourceCard({
  query,
  path,
  kind,
  name,
  onOpenItem,
}: {
  query: {
    data: SourceDetail | undefined
    isPending: boolean
    error: unknown
    refetch: () => unknown
  }
  path: string
  kind: SourceDetailKind
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  if (query.error || !query.data)
    return (
      <SourceHoverCard
        source={null}
        kind={kind}
        name={name}
        status={
          query.error ? (
            <ApiErrorNotice
              error={query.error}
              path={path}
              missingResourceName="source"
              onRetry={() => void query.refetch()}
            />
          ) : query.isPending ? (
            'Loading source…'
          ) : (
            'Source unavailable'
          )
        }
      />
    )
  const source = query.data
  return <SourceHoverCard source={source} onOpenItem={onOpenItem} />
}

type SourceDetailCardProps =
  | { source: SourceDetail; onOpenItem?: OpenItem }
  | {
      source: null
      kind: SourceDetailKind
      name: string
      status: ReactNode
      onOpenItem?: OpenItem
    }

function useSourceDetailDefinition(props: SourceDetailCardProps): DetailCardDefinition {
  const openItem = useOpenItemFromCard(props.onOpenItem)
  if (props.source === null)
    return resourceStatusDefinition({
      kicker: SOURCE_CARD_LABELS[props.kind],
      name: props.name,
      facts: sourceFacts(props.kind),
      status: props.status,
    })
  const source = props.source
  const sections = [
    detailCardSection({
      key: 'quests',
      heading: 'Quests',
      entries: source.quests.map((quest) => ({ ...quest, onOpenItem: props.onOpenItem })),
      FullView: SourceQuestsView,
      briefEntryLimit: 5,
    }),
    detailCardSection({
      key: 'items',
      heading: source.kind === 'questChain' || source.kind === 'saga' ? 'Rewards' : 'Items',
      entries: source.items.map((item) => ({ ...item, onOpenItem: openItem })),
      FullView: LinkedItemsView,
      briefEntryLimit: 5,
    }),
    detailCardSection({
      key: 'recipes',
      heading: 'Recipes',
      entries: source.recipes,
      FullView: SourceRecipesView,
      briefEntryLimit: 5,
    }),
  ]
  return {
    kicker: SOURCE_CARD_LABELS[source.kind],
    name: source.name,
    facts: sourceFacts(source.kind, source),
    sections,
  }
}

export function SourceDetailCard(props: SourceDetailCardProps): JSX.Element {
  const definition = useSourceDetailDefinition(props)
  return <StructuredDetailCard variant="pane" {...definition} />
}

export function SourceHoverCard(props: SourceDetailCardProps): JSX.Element {
  const definition = useSourceDetailDefinition(props)
  return <StructuredDetailCard variant="hover" {...definition} />
}

function sourceFacts(kind: SourceDetailKind, source?: SourceDetail): DetailCardFact[] {
  switch (kind) {
    case 'adventurePack':
      return [
        {
          label: 'Free to play',
          value: source?.isFreeToPlay == null ? null : source.isFreeToPlay ? 'Yes' : 'No',
        },
      ]
    case 'questChain':
    case 'saga':
      return [{ label: 'Pack', value: source?.pack }]
    case 'craftingSystem':
      return [
        { label: 'Pack', value: source?.pack },
        { label: 'NPC', value: source?.npc },
        { label: 'Ingredients', value: source?.ingredientCount },
      ]
    case 'vendor':
      return [
        { label: 'Pack', value: source?.pack },
        { label: 'Location', value: source?.location },
      ]
    case 'event':
      return [{ label: 'Items', value: source?.items.length }]
  }
}

function SourceQuestsView({
  entries,
}: {
  entries: readonly (SourceQuest & { onOpenItem?: OpenItem })[]
}): JSX.Element {
  return (
    <div className="resources-hover-rows">
      {entries.map((quest) => (
        <div key={quest.id} className="resources-hover-row hover-card-row">
          <QuestHoverAnchor questId={quest.id} onOpenItem={quest.onOpenItem}>
            {quest.name}
          </QuestHoverAnchor>
          <span>{quest.level === null ? '' : `Level ${quest.level}`}</span>
        </div>
      ))}
    </div>
  )
}

function SourceRecipesView({ entries }: { entries: readonly SourceRecipe[] }): JSX.Element {
  return (
    <div className="resources-hover-rows">
      {entries.map((recipe, index) => (
        <div key={`${recipe.name}-${index}`} className="resources-hover-row hover-card-row">
          <span>{recipe.name}</span>
          <span>{recipe.outputs.join(' · ')}</span>
        </div>
      ))}
    </div>
  )
}

function AdventurePackHoverContent({
  id,
  name,
  onOpenItem,
}: {
  id: number
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useAdventurePack(id)
  return (
    <LoadedSourceCard
      query={query}
      path={`/v1/adventure-packs/${id}`}
      kind="adventurePack"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function QuestChainHoverContent({
  id,
  name,
  onOpenItem,
}: {
  id: number
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useQuestChain(id)
  return (
    <LoadedSourceCard
      query={query}
      path={`/v1/quest-chains/${id}`}
      kind="questChain"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function SagaHoverContent({
  id,
  name,
  onOpenItem,
}: {
  id: number
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useSaga(id)
  return (
    <LoadedSourceCard
      query={query}
      path={`/v1/sagas/${id}`}
      kind="saga"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function CraftingSystemHoverContent({
  id,
  name,
  onOpenItem,
}: {
  id: number
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useCraftingSystem(id)
  return (
    <LoadedSourceCard
      query={query}
      path={`/v1/crafting-systems/${id}`}
      kind="craftingSystem"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function VendorHoverContent({
  id,
  name,
  onOpenItem,
}: {
  id: number
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useVendor(id)
  return (
    <LoadedSourceCard
      query={query}
      path={`/v1/vendors/${id}`}
      kind="vendor"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function EventHoverContent({
  id,
  name,
  onOpenItem,
}: {
  id: number
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useEvent(id)
  return (
    <LoadedSourceCard
      query={query}
      path={`/v1/events/${id}`}
      kind="event"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

export function SetHoverAnchor({
  setId,
  name,
  onOpenItem,
}: {
  setId: number
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const anchor = useHoverCard({
    kind: 'set',
    delayMs: 120,
    render: () => <SetHoverCard setId={setId} onOpenItem={onOpenItem} />,
  })
  return (
    <span className="resources-hover-anchor" tabIndex={0} {...anchor}>
      {name}
    </span>
  )
}

function useSetDetailDefinition({
  setId,
  onOpenItem,
}: {
  setId: number
  onOpenItem?: OpenItem
}): DetailCardDefinition {
  const openItem = useOpenItemFromCard(onOpenItem)
  const setQuery = useSet(setId)
  if (setQuery.error || !setQuery.data)
    return resourceStatusDefinition({
      kicker: 'Set',
      name: 'Set',
      facts: setFacts(),
      status: setQuery.error ? (
        <ApiErrorNotice
          error={setQuery.error}
          path={`/v1/sets/${setId}`}
          missingResourceName="set"
          onRetry={() => void setQuery.refetch()}
        />
      ) : setQuery.isPending ? (
        'Loading set…'
      ) : (
        'Set unavailable'
      ),
    })
  const set = setQuery.data
  const facts = setFacts(set)
  const sections = [
    detailCardSection({
      key: 'pieces',
      heading: 'Pieces',
      entries: set.items.map((item) => ({ ...item, onOpenItem: openItem })),
      FullView: LinkedItemsView,
      briefEntryLimit: 5,
    }),
    detailCardSection({
      key: 'set-bonuses',
      heading: 'Set bonuses',
      entries: set.tiers.map((tier) => ({ ...tier, originName: set.name })),
      FullView: SetTiersView,
    }),
  ]
  return { kicker: 'Set', name: set.name, facts, sections }
}

function setFacts(set?: NonNullable<ReturnType<typeof useSet>['data']>): DetailCardFact[] {
  return [
    { label: 'Pieces', value: set?.items.length },
    { label: 'Bonus tiers', value: set?.tiers.length },
  ]
}

export function SetDetailCard(props: { setId: number; onOpenItem?: OpenItem }): JSX.Element {
  const definition = useSetDetailDefinition(props)
  return <StructuredDetailCard variant="pane" {...definition} />
}

export function SetHoverCard(props: { setId: number; onOpenItem?: OpenItem }): JSX.Element {
  const definition = useSetDetailDefinition(props)
  return <StructuredDetailCard variant="hover" {...definition} />
}

function SetTiersView({
  entries,
}: {
  entries: readonly (SetTier & { originName: string })[]
}): JSX.Element {
  return (
    <>
      {entries.map((tier) => (
        <div key={tier.equippedCount}>
          <div className="resources-set-tier hover-card-row">
            <span>{tier.equippedCount} pieces</span>
          </div>
          {tier.effects.map((effect) => (
            <SetEffectRow
              key={`${effect.id}-${effect.sortOrder}`}
              effect={effect}
              originName={tier.originName}
            />
          ))}
        </div>
      ))}
    </>
  )
}

function SetEffectRow({ effect, originName }: { effect: Effect; originName: string }): JSX.Element {
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    isRow: true,
    render: () => <BonusHoverCard effect={effect} originName={originName} />,
  })
  return (
    <div className="resources-hover-effect-row" tabIndex={0} {...anchor}>
      <DetailValueRow
        label={effect.name}
        value={effectValue(effect) ?? '—'}
        type={effect.bonusType ?? '—'}
        className="hover-card-row"
      />
      {effect.damage.map((damage, index) => (
        <span key={index} className="resources-effect-damage">
          {effectDamageText(damage)}
        </span>
      ))}
    </div>
  )
}
