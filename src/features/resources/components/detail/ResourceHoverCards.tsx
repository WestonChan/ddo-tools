import type { JSX, ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  DetailCardSection,
  DetailMore,
  useClearHoverCards,
  useHoverCard,
} from '../../../../components'
import { useItem, useQuest, useSet } from '../../queries/useItems'
import { ItemDetailCard } from './ItemDetailCard'

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
  if (itemQuery.isPending) return <span>Loading item…</span>
  if (!itemQuery.data) return <span>Item unavailable</span>
  return (
    <ItemDetailCard
      item={itemQuery.data}
      augmentsBySlotLabel={{}}
      setDetail={setQuery.data}
      variant="hover"
      onOpenItem={openItem}
    />
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
      className="resources-hover-row"
      onClick={() => onOpenItem(id, name)}
      {...anchor}
    >
      <span>{name}</span>
      <span>{slot}</span>
    </button>
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
            <div className="resources-set-tier">
              <span>{tier.equippedCount} pieces</span>
              {tier.description && <span>{tier.description}</span>}
            </div>
            {tier.bonuses.map((bonus) => (
              <SetBonusRow
                key={bonus.key}
                name={bonus.name}
                type={bonus.type}
                description={bonus.description}
              />
            ))}
          </div>
        ))}
      </DetailCardSection>
    </>
  )
}

function SetBonusRow({
  name,
  type,
  description,
}: {
  name: string
  type: string | null
  description: string | null
}): JSX.Element {
  const anchor = useHoverCard({
    kind: 'enchantment',
    delayMs: 120,
    render: () => (
      <>
        <strong className="resources-hover-title">{name}</strong>
        {type && <span className="resources-hover-fact">Type · {type}</span>}
        {description && <p className="resources-hover-definition">{description}</p>}
      </>
    ),
  })
  return (
    <div className="resources-hover-row" tabIndex={0} {...anchor}>
      <span>{name}</span>
      <span>{type}</span>
    </div>
  )
}
