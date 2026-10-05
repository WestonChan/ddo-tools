import type { JSX, ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ApiErrorNotice,
  DetailCardSection,
  DetailMore,
  DetailValueRow,
  WikiLinkIcon,
  useClearHoverCards,
  useHoverCard,
  useHoverCardLabel,
} from '../../../../components'
import {
  useItem,
  useQuest,
  useSet,
  useAugment,
  useAdventurePack,
  useQuestChain,
  useSaga,
  useCraftingSystem,
  useVendor,
  useEvent,
  useEffectDetail,
} from '../../queries/useItems'
import type { SourceDetail, SourceDetailKind } from '../../queries/sources'
import { toEffectDamage, type Effect } from '../../queries/items'
import { effectDamageText, effectHoverCopy, effectValue, damageExpression } from './structuredRows'
import { ItemDetailCard } from './ItemDetailCard'
import { effectKindLabel } from '../effectKindLabel'
import { numberWithPlusSign } from './numberWithPlusSign'

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
  const itemQuery = useItem(itemId)
  const setQuery = useSet(itemQuery.data?.setId ?? null)
  if (itemQuery.error)
    return (
      <ApiErrorNotice
        error={itemQuery.error}
        path={`/v1/items/${itemId}`}
        missingResourceName="item"
        onRetry={() => void itemQuery.refetch()}
      />
    )
  if (itemQuery.isPending) return <span>Loading item…</span>
  if (!itemQuery.data) return <span>Item unavailable</span>
  return (
    <>
      <ItemDetailCard
        item={itemQuery.data}
        setDetail={setQuery.data}
        variant="hover"
        onOpenItem={openItem}
      />
      {setQuery.error && (
        <ApiErrorNotice
          error={setQuery.error}
          path={`/v1/sets/${itemQuery.data.setId}`}
          missingResourceName="set"
          onRetry={() => void setQuery.refetch()}
        />
      )}
    </>
  )
}

export function AugmentHoverContent({ augmentId }: { augmentId: number }): JSX.Element {
  const augmentQuery = useAugment(augmentId)
  if (augmentQuery.error)
    return (
      <ApiErrorNotice
        error={augmentQuery.error}
        path={`/v1/augments/${augmentId}`}
        missingResourceName="augment"
        onRetry={() => void augmentQuery.refetch()}
      />
    )
  if (augmentQuery.isPending) return <span>Loading augment…</span>
  if (!augmentQuery.data) return <span>Augment unavailable</span>
  const augment = augmentQuery.data
  return (
    <>
      <strong className="resources-hover-title">{augment.name}</strong>
      <span className="resources-hover-fact">
        ML {augment.minimumLevel ?? '—'} · {augment.slots.join(' · ')}
      </span>
      {augment.effects.map((effect) => (
        <AugmentEffectRow key={`${effect.id}-${effect.sortOrder}`} effect={effect} />
      ))}
      {augment.modifiers.flatMap((modifier) => {
        const damage = damageExpression(modifier)
        return damage
          ? [
              <DetailValueRow
                key={modifier.id}
                label="Damage"
                value={damage}
                tone="damage"
                className="hover-card-row"
              />,
            ]
          : []
      })}
      {(augment.effectDescription || augment.description) && (
        <p className="resources-hover-definition">
          {augment.effectDescription || augment.description}
        </p>
      )}
    </>
  )
}

function AugmentEffectRow({ effect }: { effect: Effect }): JSX.Element {
  const hoverCopy = effectHoverCopy(effect)
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    render: () => (
      <>
        <EffectVocabularyHoverContent
          detailPath={`/v1/effects/${effect.id}`}
          verboseName={hoverCopy.verboseName}
        />
        {effect.bonuses.map((bonus) => (
          <DetailValueRow
            key={`${bonus.statName}-${bonus.bonusType}`}
            label={bonus.statName}
            value={numberWithPlusSign(bonus.value)}
            type={bonus.bonusType}
            className="hover-card-row"
          />
        ))}
        {hoverCopy.description && (
          <p className="resources-hover-definition">{hoverCopy.description}</p>
        )}
      </>
    ),
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

export function EffectVocabularyHoverContent({
  detailPath,
  verboseName,
}: {
  detailPath: string
  verboseName?: string | null
}): JSX.Element {
  const detailQuery = useEffectDetail(detailPath)
  useHoverCardLabel(detailQuery.data ? effectKindLabel(detailQuery.data.kind) : null)
  if (detailQuery.error)
    return (
      <ApiErrorNotice
        error={detailQuery.error}
        path={detailPath}
        missingResourceName="bonus"
        onRetry={() => void detailQuery.refetch()}
      />
    )
  if (detailQuery.isPending) return <span>Loading bonus…</span>
  if (!detailQuery.data) return <span>Bonus unavailable</span>
  const detail = detailQuery.data
  return (
    <>
      <strong className="resources-hover-title">
        {detail.wiki_url ? (
          <WikiLinkIcon
            href={detail.wiki_url}
            pageName={detail.name}
            label={detail.name}
            className="resources-effect-wiki-name"
          />
        ) : (
          detail.name
        )}
      </strong>
      {verboseName && <span className="resources-hover-fact">{verboseName}</span>}
      <span className="resources-hover-fact">
        {effectKindLabel(detail.kind)}
        {detail.category ? ` · ${detail.category}` : ''}
      </span>
      {detail.tier && (
        <span className="resources-hover-fact">
          {detail.tier.group} · Step {detail.tier.rank} of {detail.tier.steps.length}
        </span>
      )}
      {detail.bonuses.length > 0 && (
        <DetailCardSection heading="Stats">
          {detail.bonuses.map((bonus, index) => (
            <div
              key={`${bonus.target}-${bonus.bonus_type}-${index}`}
              className="resources-hover-fact hover-card-row"
            >
              {bonus.target}
              {bonus.bonus_type ? ` · ${bonus.bonus_type}` : ''}
            </div>
          ))}
        </DetailCardSection>
      )}
      {detail.damage.map((damage, index) => (
        <DetailValueRow
          key={`damage-${index}`}
          label="Damage"
          value={effectDamageText(toEffectDamage(damage))}
          tone="damage"
          className="hover-card-row"
        />
      ))}
      <DetailValueRow label="Items" value={String(detail.items.total)} className="hover-card-row" />
      <DetailValueRow
        label="Augments"
        value={String(detail.augments.total)}
        className="hover-card-row"
      />
      <DetailValueRow
        label="Set tiers"
        value={String(detail.set_tiers.total)}
        className="hover-card-row"
      />
    </>
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
    render: () => <QuestHoverContent questId={questId} onOpenItem={onOpenItem} />,
  })
  return (
    <span className="resources-hover-anchor" tabIndex={0} {...anchor}>
      {children}
    </span>
  )
}

function QuestHoverContent({
  questId,
  onOpenItem,
}: {
  questId: number
  onOpenItem?: OpenItem
}): JSX.Element {
  const openItem = useOpenItemFromCard(onOpenItem)
  const questQuery = useQuest(questId)
  if (questQuery.error)
    return (
      <ApiErrorNotice
        error={questQuery.error}
        path={`/v1/quests/${questId}`}
        missingResourceName="quest"
        onRetry={() => void questQuery.refetch()}
      />
    )
  if (questQuery.isPending) return <span>Loading quest…</span>
  if (!questQuery.data) return <span>Quest unavailable</span>
  const quest = questQuery.data
  const uniqueItems = [...new Map(quest.items.map((item) => [item.id, item])).values()]
  return (
    <>
      <strong className="resources-hover-title">{quest.name}</strong>
      <span className="resources-hover-fact">
        {[quest.pack, quest.isRaid ? 'Raid' : null].filter(Boolean).join(' · ')}
      </span>
      <DetailCardSection heading="Drops here">
        <div className="resources-hover-rows">
          {uniqueItems.slice(0, 5).map((item) => (
            <LinkedItemRow
              key={item.id}
              id={item.id}
              name={item.name}
              slot={item.slot}
              onOpenItem={openItem}
            />
          ))}
        </div>
        <DetailMore count={uniqueItems.length - 5} />
      </DetailCardSection>
    </>
  )
}

function LinkedItemRow({
  id,
  name,
  slot,
  onOpenItem,
}: {
  id: number
  name: string
  slot: string
  onOpenItem: OpenItem
}): JSX.Element {
  const anchor = useHoverCard({
    kind: 'item',
    delayMs: 120,
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
    label: isHint ? undefined : SOURCE_CARD_LABELS[kind],
    delayMs: 120,
    render: () =>
      isHint ? (
        <span className="resources-source-hint">
          <strong>{name}</strong>
          <WikiLinkIcon href={wikiUrl ?? undefined} pageName={name} />
        </span>
      ) : (
        <SourceHoverContent kind={kind} id={id} onOpenItem={onOpenItem} />
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
  onOpenItem,
}: {
  kind: SourceDetailKind
  id: number
  onOpenItem?: OpenItem
}): JSX.Element {
  switch (kind) {
    case 'adventurePack':
      return <AdventurePackHoverContent id={id} onOpenItem={onOpenItem} />
    case 'questChain':
      return <QuestChainHoverContent id={id} onOpenItem={onOpenItem} />
    case 'saga':
      return <SagaHoverContent id={id} onOpenItem={onOpenItem} />
    case 'craftingSystem':
      return <CraftingSystemHoverContent id={id} onOpenItem={onOpenItem} />
    case 'vendor':
      return <VendorHoverContent id={id} onOpenItem={onOpenItem} />
    case 'event':
      return <EventHoverContent id={id} onOpenItem={onOpenItem} />
  }
}

function LoadedSourceCard({
  query,
  path,
  onOpenItem,
}: {
  query: {
    data: SourceDetail | undefined
    isPending: boolean
    error: unknown
    refetch: () => unknown
  }
  path: string
  onOpenItem?: OpenItem
}): JSX.Element {
  const openItem = useOpenItemFromCard(onOpenItem)
  if (query.error)
    return (
      <ApiErrorNotice
        error={query.error}
        path={path}
        missingResourceName="source"
        onRetry={() => void query.refetch()}
      />
    )
  if (query.isPending) return <span>Loading source…</span>
  const source = query.data
  if (!source) return <span>Source unavailable</span>
  const facts = [
    source.pack,
    source.isFreeToPlay === null ? null : source.isFreeToPlay ? 'Free to play' : 'Adventure pack',
    source.location,
    source.npc,
    source.ingredientCount === null ? null : `${source.ingredientCount} ingredients`,
  ].filter(Boolean)
  return (
    <>
      <strong className="resources-hover-title">{source.name}</strong>
      {facts.map((fact) => (
        <span key={fact} className="resources-hover-fact">
          {fact}
        </span>
      ))}
      {source.quests.length > 0 && (
        <DetailCardSection heading="Quests">
          <div className="resources-hover-rows">
            {source.quests.slice(0, 5).map((quest) => (
              <div key={quest.id} className="resources-hover-row hover-card-row">
                <QuestHoverAnchor questId={quest.id} onOpenItem={onOpenItem}>
                  {quest.name}
                </QuestHoverAnchor>
                <span>{quest.level === null ? '' : `Level ${quest.level}`}</span>
              </div>
            ))}
          </div>
          <DetailMore count={source.quests.length - 5} />
        </DetailCardSection>
      )}
      {source.items.length > 0 && (
        <DetailCardSection
          heading={source.kind === 'questChain' || source.kind === 'saga' ? 'Rewards' : 'Items'}
        >
          <div className="resources-hover-rows">
            {source.items.slice(0, 5).map((item) => (
              <LinkedItemRow key={item.id} {...item} onOpenItem={openItem} />
            ))}
          </div>
          <DetailMore count={source.items.length - 5} />
        </DetailCardSection>
      )}
      {source.recipes.length > 0 && (
        <DetailCardSection heading="Recipes">
          <div className="resources-hover-rows">
            {source.recipes.slice(0, 5).map((recipe, index) => (
              <div key={`${recipe.name}-${index}`} className="resources-hover-row hover-card-row">
                <span>{recipe.name}</span>
                <span>{recipe.outputs.join(' · ')}</span>
              </div>
            ))}
          </div>
          <DetailMore count={source.recipes.length - 5} />
        </DetailCardSection>
      )}
    </>
  )
}

function AdventurePackHoverContent({
  id,
  onOpenItem,
}: {
  id: number
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useAdventurePack(id)
  return (
    <LoadedSourceCard query={query} path={`/v1/adventure-packs/${id}`} onOpenItem={onOpenItem} />
  )
}

function QuestChainHoverContent({
  id,
  onOpenItem,
}: {
  id: number
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useQuestChain(id)
  return <LoadedSourceCard query={query} path={`/v1/quest-chains/${id}`} onOpenItem={onOpenItem} />
}

function SagaHoverContent({ id, onOpenItem }: { id: number; onOpenItem?: OpenItem }): JSX.Element {
  const query = useSaga(id)
  return <LoadedSourceCard query={query} path={`/v1/sagas/${id}`} onOpenItem={onOpenItem} />
}

function CraftingSystemHoverContent({
  id,
  onOpenItem,
}: {
  id: number
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useCraftingSystem(id)
  return (
    <LoadedSourceCard query={query} path={`/v1/crafting-systems/${id}`} onOpenItem={onOpenItem} />
  )
}

function VendorHoverContent({
  id,
  onOpenItem,
}: {
  id: number
  onOpenItem?: OpenItem
}): JSX.Element {
  const query = useVendor(id)
  return <LoadedSourceCard query={query} path={`/v1/vendors/${id}`} onOpenItem={onOpenItem} />
}

function EventHoverContent({ id, onOpenItem }: { id: number; onOpenItem?: OpenItem }): JSX.Element {
  const query = useEvent(id)
  return <LoadedSourceCard query={query} path={`/v1/events/${id}`} onOpenItem={onOpenItem} />
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
    render: () => <SetHoverContent setId={setId} onOpenItem={onOpenItem} />,
  })
  return (
    <span className="resources-hover-anchor" tabIndex={0} {...anchor}>
      {name}
    </span>
  )
}

export function SetHoverContent({
  setId,
  onOpenItem,
}: {
  setId: number
  onOpenItem?: OpenItem
}): JSX.Element {
  const openItem = useOpenItemFromCard(onOpenItem)
  const setQuery = useSet(setId)
  if (setQuery.error)
    return (
      <ApiErrorNotice
        error={setQuery.error}
        path={`/v1/sets/${setId}`}
        missingResourceName="set"
        onRetry={() => void setQuery.refetch()}
      />
    )
  if (setQuery.isPending) return <span>Loading set…</span>
  if (!setQuery.data) return <span>Set unavailable</span>
  const set = setQuery.data
  return (
    <>
      <strong className="resources-hover-title">{set.name}</strong>
      <span className="resources-hover-fact">
        {set.items.length} {set.items.length === 1 ? 'piece' : 'pieces'}
      </span>
      <DetailCardSection heading="Pieces">
        {set.items.slice(0, 5).map((item) => (
          <LinkedItemRow
            key={item.id}
            id={item.id}
            name={item.name}
            slot={item.slot}
            onOpenItem={openItem}
          />
        ))}
        <DetailMore count={set.items.length - 5} />
      </DetailCardSection>
      <DetailCardSection heading="Set bonuses">
        {set.tiers.map((tier) => (
          <div key={tier.equippedCount}>
            <div className="resources-set-tier hover-card-row">
              <span>{tier.equippedCount} pieces</span>
            </div>
            {tier.effects.map((effect) => (
              <SetEffectRow key={`${effect.id}-${effect.sortOrder}`} effect={effect} />
            ))}
          </div>
        ))}
      </DetailCardSection>
    </>
  )
}

function SetEffectRow({ effect }: { effect: Effect }): JSX.Element {
  const hoverCopy = effectHoverCopy(effect)
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    render: () => (
      <>
        <EffectVocabularyHoverContent
          detailPath={`/v1/effects/${effect.id}`}
          verboseName={hoverCopy.verboseName}
        />
        {hoverCopy.description && (
          <p className="resources-hover-definition">{hoverCopy.description}</p>
        )}
      </>
    ),
  })
  return (
    <div className="resources-hover-effect-row" tabIndex={0} {...anchor}>
      <div className="resources-hover-row hover-card-row">
        <span>{effect.name}</span>
        <span>{effect.bonusType}</span>
      </div>
      {effect.damage.map((damage, index) => (
        <span key={index} className="resources-effect-damage">
          {effectDamageText(damage)}
        </span>
      ))}
    </div>
  )
}
