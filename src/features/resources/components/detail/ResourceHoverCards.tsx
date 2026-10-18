import type { JSX, ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { resourcePath } from '../../../../lib/resourcePaths'
import { apiDetailPath, type Slug } from '../../../../lib/api'
import {
  ApiErrorNotice,
  AugmentSlotDisplay,
  StructuredDetailCard,
  IngredientCostList,
  detailCardSection,
  type DetailCardDefinition,
  type DetailCardFact,
  DetailValueRow,
  WikiLinkIcon,
  useClearHoverCards,
  useHoverCard,
  NESTED_CARD_OPEN_DELAY_MS,
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
  prefetchItemCard,
  isItemCardReady,
  prefetchEffect,
  isEffectReady,
  isDetailQueryReady,
  questDetailQueryOptions,
  sourceDetailQueryOptions,
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
import type { IngredientCost } from '../../../../lib/ingredientCost'

type OpenItem = (slug: Slug, name: string) => void

function useOpenItemFromCard(onOpenItem?: OpenItem): OpenItem {
  const navigate = useNavigate()
  const clearCards = useClearHoverCards()
  return (slug, name) => {
    clearCards()
    if (onOpenItem) onOpenItem(slug, name)
    else void navigate({ to: resourcePath('items', slug) })
  }
}

export function ItemHoverContent({
  itemSlug,
  onOpenItem,
}: {
  itemSlug: Slug
  onOpenItem?: OpenItem
}): JSX.Element {
  const openItem = useOpenItemFromCard(onOpenItem)
  const { item, setDetails, status } = useItemCardContent(itemSlug)
  return <ItemHoverCard item={item} setDetails={setDetails} onOpenItem={openItem} status={status} />
}

function useAugmentDetailDefinition(augmentSlug: Slug): DetailCardDefinition {
  const augmentQuery = useAugment(augmentSlug)
  if (augmentQuery.error || !augmentQuery.data)
    return resourceStatusDefinition({
      kicker: 'Augment',
      name: 'Augment',
      facts: augmentFacts(),
      status: augmentQuery.error ? (
        <ApiErrorNotice
          error={augmentQuery.error}
          path={apiDetailPath('augments', augmentSlug)}
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

export function AugmentDetailCard({ augmentSlug }: { augmentSlug: Slug }): JSX.Element {
  const definition = useAugmentDetailDefinition(augmentSlug)
  return <StructuredDetailCard variant="pane" {...definition} />
}

export function AugmentHoverCard({ augmentSlug }: { augmentSlug: Slug }): JSX.Element {
  const definition = useAugmentDetailDefinition(augmentSlug)
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
          key={`${effect.slug}-${effect.sortOrder}`}
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
  const queryClient = useQueryClient()
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: NESTED_CARD_OPEN_DELAY_MS,
    isRow: true,
    prefetch: () => prefetchEffect(queryClient, effect.slug),
    isReady: () => isEffectReady(queryClient, effect.slug),
    render: () => <BonusHoverCard effect={effect} originName={originName} />,
  })
  return (
    <div
      className="resources-hover-effect-row focus-ring-row focus-ring-proxy"
      tabIndex={0}
      {...anchor}
    >
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
  questSlug,
  onOpenItem,
  children,
}: {
  questSlug: Slug
  onOpenItem?: OpenItem
  children: ReactNode
}): JSX.Element {
  const queryClient = useQueryClient()
  const anchor = useHoverCard({
    kind: 'quest',
    delayMs: NESTED_CARD_OPEN_DELAY_MS,
    prefetch: () => queryClient.ensureQueryData(questDetailQueryOptions(questSlug)),
    isReady: () => isDetailQueryReady(queryClient, questDetailQueryOptions(questSlug)),
    render: () => <QuestHoverCard questSlug={questSlug} onOpenItem={onOpenItem} />,
  })
  return (
    <span className="resources-hover-anchor" tabIndex={0} {...anchor}>
      {children}
    </span>
  )
}

function useQuestDetailDefinition({
  questSlug,
  onOpenItem,
}: {
  questSlug: Slug
  onOpenItem?: OpenItem
}): DetailCardDefinition {
  const openItem = useOpenItemFromCard(onOpenItem)
  const questQuery = useQuest(questSlug)
  if (questQuery.error || !questQuery.data)
    return resourceStatusDefinition({
      kicker: 'Quest',
      name: 'Quest',
      facts: questFacts(),
      status: questQuery.error ? (
        <ApiErrorNotice
          error={questQuery.error}
          path={apiDetailPath('quests', questSlug)}
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
  const uniqueItems = [...new Map(quest.items.map((item) => [item.slug, item])).values()]
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

export function QuestDetailCard(props: { questSlug: Slug; onOpenItem?: OpenItem }): JSX.Element {
  const definition = useQuestDetailDefinition(props)
  return <StructuredDetailCard variant="pane" {...definition} />
}

export function QuestHoverCard(props: { questSlug: Slug; onOpenItem?: OpenItem }): JSX.Element {
  const definition = useQuestDetailDefinition(props)
  return <StructuredDetailCard variant="hover" {...definition} />
}

type LinkedItem = {
  slug: Slug
  name: string
  slot: string
  minimumLevel?: number | null
  isRareLoot?: boolean
  chest?: string | null
  price?: IngredientCost[]
  tier?: string | null
  pack?: string | null
  onOpenItem: OpenItem
}

function LinkedItemsView({ entries }: { entries: readonly LinkedItem[] }): JSX.Element {
  return (
    <div className="resources-hover-rows">
      {entries.map((item) => (
        <LinkedItemRow key={item.slug} {...item} />
      ))}
    </div>
  )
}

function LinkedItemRow({
  slug,
  name,
  slot,
  minimumLevel,
  isRareLoot,
  chest,
  price = [],
  tier,
  pack,
  onOpenItem,
}: LinkedItem): JSX.Element {
  const queryClient = useQueryClient()
  const anchor = useHoverCard({
    kind: 'item',
    delayMs: NESTED_CARD_OPEN_DELAY_MS,
    isRow: true,
    prefetch: () => prefetchItemCard(queryClient, slug),
    isReady: () => isItemCardReady(queryClient, slug),
    render: () => <ItemHoverContent itemSlug={slug} onOpenItem={onOpenItem} />,
  })
  return (
    <button
      type="button"
      className="resources-hover-row hover-card-row focus-ring-row focus-ring-proxy"
      onClick={() => onOpenItem(slug, name)}
      {...anchor}
    >
      <span>{name}</span>
      <span>{slot}</span>
      {((minimumLevel !== undefined && minimumLevel !== null) ||
        isRareLoot ||
        chest ||
        price.length > 0 ||
        tier ||
        pack) && (
        <span className="resources-source-item-details">
          {[
            minimumLevel !== undefined && minimumLevel !== null ? `ML ${minimumLevel}` : null,
            chest,
            isRareLoot ? 'Rare' : null,
            tier,
            pack,
          ]
            .filter(Boolean)
            .join(' · ')}
          <IngredientCostList costs={price} />
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
  slug,
  name,
  wikiUrl,
  onOpenItem,
  children,
}: {
  kind: SourceHoverKind
  slug: Slug | null
  name: string
  wikiUrl?: string | null
  onOpenItem?: OpenItem
  children: ReactNode
}): JSX.Element {
  const queryClient = useQueryClient()
  const isHint = kind === 'challengePack' || kind === 'starter' || slug === null
  const anchor = useHoverCard({
    kind: isHint ? 'hint' : kind,
    delayMs: NESTED_CARD_OPEN_DELAY_MS,
    prefetch:
      kind === 'challengePack' || kind === 'starter' || slug === null
        ? undefined
        : () => queryClient.ensureQueryData(sourceDetailQueryOptions(kind, slug)),
    isReady:
      kind === 'challengePack' || kind === 'starter' || slug === null
        ? undefined
        : () => isDetailQueryReady(queryClient, sourceDetailQueryOptions(kind, slug)),
    render: () =>
      isHint ? (
        <span className="resources-source-hint">
          <strong>{name}</strong>
          <WikiLinkIcon href={wikiUrl ?? undefined} pageName={name} />
        </span>
      ) : (
        <SourceHoverContent kind={kind} slug={slug} name={name} onOpenItem={onOpenItem} />
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
  slug,
  name,
  onOpenItem,
}: {
  kind: SourceDetailKind
  slug: Slug
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  switch (kind) {
    case 'adventurePack':
      return <AdventurePackHoverContent slug={slug} name={name} onOpenItem={onOpenItem} />
    case 'questChain':
      return <QuestChainHoverContent slug={slug} name={name} onOpenItem={onOpenItem} />
    case 'saga':
      return <SagaHoverContent slug={slug} name={name} onOpenItem={onOpenItem} />
    case 'craftingSystem':
      return <CraftingSystemHoverContent slug={slug} name={name} onOpenItem={onOpenItem} />
    case 'vendor':
      return <VendorHoverContent slug={slug} name={name} onOpenItem={onOpenItem} />
    case 'event':
      return <EventHoverContent slug={slug} name={name} onOpenItem={onOpenItem} />
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
        <div key={quest.slug} className="resources-hover-row hover-card-row">
          <QuestHoverAnchor questSlug={quest.slug} onOpenItem={quest.onOpenItem}>
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
  slug,
  name,
  onOpenItem,
}: {
  slug: Slug
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useAdventurePack(slug)
  return (
    <LoadedSourceCard
      query={query}
      path={apiDetailPath('adventure-packs', slug)}
      kind="adventurePack"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function QuestChainHoverContent({
  slug,
  name,
  onOpenItem,
}: {
  slug: Slug
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useQuestChain(slug)
  return (
    <LoadedSourceCard
      query={query}
      path={apiDetailPath('quest-chains', slug)}
      kind="questChain"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function SagaHoverContent({
  slug,
  name,
  onOpenItem,
}: {
  slug: Slug
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useSaga(slug)
  return (
    <LoadedSourceCard
      query={query}
      path={apiDetailPath('sagas', slug)}
      kind="saga"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function CraftingSystemHoverContent({
  slug,
  name,
  onOpenItem,
}: {
  slug: Slug
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useCraftingSystem(slug)
  return (
    <LoadedSourceCard
      query={query}
      path={apiDetailPath('crafting-systems', slug)}
      kind="craftingSystem"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function VendorHoverContent({
  slug,
  name,
  onOpenItem,
}: {
  slug: Slug
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useVendor(slug)
  return (
    <LoadedSourceCard
      query={query}
      path={apiDetailPath('vendors', slug)}
      kind="vendor"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function EventHoverContent({
  slug,
  name,
  onOpenItem,
}: {
  slug: Slug
  name: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useEvent(slug)
  return (
    <LoadedSourceCard
      query={query}
      path={apiDetailPath('events', slug)}
      kind="event"
      name={name}
      onOpenItem={onOpenItem}
    />
  )
}

function useSetDetailDefinition({
  setSlug,
  onOpenItem,
}: {
  setSlug: Slug
  onOpenItem?: OpenItem
}): DetailCardDefinition {
  const openItem = useOpenItemFromCard(onOpenItem)
  const setQuery = useSet(setSlug)
  if (setQuery.error || !setQuery.data)
    return resourceStatusDefinition({
      kicker: 'Set',
      name: 'Set',
      facts: setFacts(),
      status: setQuery.error ? (
        <ApiErrorNotice
          error={setQuery.error}
          path={apiDetailPath('sets', setSlug)}
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

export function SetDetailCard(props: { setSlug: Slug; onOpenItem?: OpenItem }): JSX.Element {
  const definition = useSetDetailDefinition(props)
  return <StructuredDetailCard variant="pane" {...definition} />
}

export function SetHoverCard(props: { setSlug: Slug; onOpenItem?: OpenItem }): JSX.Element {
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
              key={`${effect.slug}-${effect.sortOrder}`}
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
  const queryClient = useQueryClient()
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: NESTED_CARD_OPEN_DELAY_MS,
    isRow: true,
    prefetch: () => prefetchEffect(queryClient, effect.slug),
    isReady: () => isEffectReady(queryClient, effect.slug),
    render: () => <BonusHoverCard effect={effect} originName={originName} />,
  })
  return (
    <div
      className="resources-hover-effect-row focus-ring-row focus-ring-proxy"
      tabIndex={0}
      {...anchor}
    >
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
