import { useState, type JSX } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  DetailCard,
  DetailCardFooter,
  DetailCardSection,
  DetailFact,
  DetailMore,
  DetailValueRow,
  WikiLinkIcon,
} from '../../../../components'
import { DropTagChip } from '../DropTagChip'
import { AugmentSlotList } from './AugmentSlotList'
import { DetailHeader } from './DetailHeader'
import { EnchantmentList } from './EnchantmentList'
import { StatList } from './StatList'
import { KeyValueGrid, type KeyValuePair } from './KeyValueGrid'
import { numberWithPlusSign } from './numberWithPlusSign'
import type { SetDetail } from '../../queries/sets'
import { sentenceCased } from './sentenceCased'
import {
  QuestHoverAnchor,
  SetHoverAnchor,
  SourceHoverAnchor,
  type SourceHoverKind,
} from './ResourceHoverCards'
import { damageExpression } from './structuredRows'
import type {
  Item,
  ItemSource,
  ItemSourceKind,
  LootQuest,
  ItemWeaponStats,
  ItemArmorStats,
} from '../../queries/items'

const ITEM_SOURCE_LABELS: Record<ItemSourceKind, string | null> = {
  adventurePack: 'Anywhere in the pack',
  craftingSystem: 'Crafted at',
  challengePack: 'Challenge rewards',
  vendor: 'Sold by',
  event: 'Event reward',
  starter: null,
}

function itemSourceMetaLine(itemSource: ItemSource): string {
  return [
    ITEM_SOURCE_LABELS[itemSource.kind],
    itemSource.vendorLocation,
    itemSource.cost,
    itemSource.chest ? sentenceCased(itemSource.chest) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

const SOURCE_KINDS_WITH_WIKI_PAGE_NAMED_AFTER_SOURCE: ReadonlySet<ItemSourceKind> = new Set([
  'adventurePack',
])

function ItemSourceRow({
  itemSource,
  onOpenItem,
}: {
  itemSource: ItemSource
  onOpenItem?: (id: number, name: string) => void
}): JSX.Element {
  const metaLine = itemSourceMetaLine(itemSource)
  const hasWikiPage =
    itemSource.wikiUrl !== null ||
    SOURCE_KINDS_WITH_WIKI_PAGE_NAMED_AFTER_SOURCE.has(itemSource.kind)
  return (
    <li className="resources-quest-row">
      <span className="resources-quest-name">
        <SourceHoverAnchor
          kind={itemSource.kind}
          id={itemSource.id}
          name={itemSource.name}
          wikiUrl={itemSource.wikiUrl}
          onOpenItem={onOpenItem}
        >
          <span className="resources-quest-title">{itemSource.name}</span>
        </SourceHoverAnchor>
        {itemSource.isRareLoot && <DropTagChip kind="rare" />}
        {hasWikiPage && (
          <WikiLinkIcon href={itemSource.wikiUrl ?? undefined} pageName={itemSource.name} />
        )}
      </span>
      {metaLine && <span className="resources-quest-meta">{metaLine}</span>}
    </li>
  )
}

function toHeaderAttributes(item: Item): KeyValuePair[] {
  const attributes: KeyValuePair[] = []
  if (item.enhancementBonus !== null) {
    attributes.push({
      label: 'Enhancement',
      value: numberWithPlusSign(item.enhancementBonus),
      isNumeric: true,
    })
  }
  if (item.material) attributes.push({ label: 'Material', value: item.material })
  if (item.requiredRace) attributes.push({ label: 'Race', value: item.requiredRace })
  return attributes
}

interface WeaponStatRow {
  label: string
  value: string
  isNumeric: boolean
}

function primaryWeaponRows(
  weaponStats: ItemWeaponStats,
  enhancementBonus: number | null,
): WeaponStatRow[] {
  const rows: WeaponStatRow[] = []
  const { baseDiceCount, baseDiceSides, baseDiceBonus, damageMultiplier } = weaponStats
  if (
    baseDiceCount !== null &&
    baseDiceSides !== null &&
    Number.isInteger(baseDiceCount) &&
    Number.isInteger(baseDiceSides) &&
    baseDiceCount > 0 &&
    baseDiceSides > 0
  ) {
    const dice = `${baseDiceCount}d${baseDiceSides}`
    const multipliedDice =
      damageMultiplier !== null && damageMultiplier !== 1 ? `${damageMultiplier}[${dice}]` : dice
    const totalBonus = (baseDiceBonus ?? 0) + (enhancementBonus ?? 0)
    const bonus = totalBonus ? `${totalBonus > 0 ? '+' : ''}${totalBonus}` : ''
    rows.push({ label: 'Damage', value: `${multipliedDice}${bonus}`, isNumeric: true })
  }

  const critical = weaponStats.critical?.trim()
  const criticalParts = critical?.match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s*\/\s*[x×]\s*(\d+)$/i)
  const threatCount = weaponStats.criticalThreatRange
  const numericRange =
    threatCount !== null && Number.isInteger(threatCount) && threatCount >= 1 && threatCount <= 20
      ? threatCount === 1
        ? '20'
        : `${21 - threatCount}–20`
      : null
  const fallbackRange = criticalParts
    ? criticalParts[2]
      ? `${criticalParts[1]}–${criticalParts[2]}`
      : criticalParts[1]
    : null
  const range = numericRange ?? fallbackRange
  const numericMultiplier = weaponStats.criticalMultiplier
  const multiplier =
    numericMultiplier !== null && Number.isInteger(numericMultiplier) && numericMultiplier > 0
      ? `${numericMultiplier}`
      : criticalParts?.[3]
  if (range) rows.push({ label: 'Crit range', value: range, isNumeric: true })
  if (multiplier) rows.push({ label: 'Crit multiplier', value: `×${multiplier}`, isNumeric: true })
  if (!range && !multiplier && critical) {
    rows.push({ label: 'Critical', value: critical, isNumeric: false })
  }
  return rows
}

function extraWeaponRows(weaponStats: ItemWeaponStats): WeaponStatRow[] {
  const rows: WeaponStatRow[] = []
  const details = [
    ['Type', weaponStats.weaponType],
    ['Proficiency', weaponStats.proficiency],
    ['Handedness', weaponStats.handedness],
  ] as const
  for (const [label, rawValue] of details) {
    const value = rawValue?.trim()
    if (value) rows.push({ label, value, isNumeric: false })
  }
  const bypasses = weaponStats.damageReductionBypasses
    .map((bypass) => bypass.trim())
    .filter(Boolean)
  if (bypasses.length)
    rows.push({ label: 'Damage reduction bypasses', value: bypasses.join(', '), isNumeric: false })
  return rows
}

function WeaponStats({
  weaponStats,
  enhancementBonus,
  variant,
}: {
  weaponStats: ItemWeaponStats
  enhancementBonus: number | null
  variant: 'pane' | 'hover'
}): JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false)
  const primaryRows = primaryWeaponRows(weaponStats, enhancementBonus)
  const extraRows = extraWeaponRows(weaponStats)
  if (primaryRows.length === 0 && extraRows.length === 0) return null
  const visibleRows =
    primaryRows.length === 0
      ? extraRows
      : [...primaryRows, ...(variant === 'pane' && isExpanded ? extraRows : [])]

  return (
    <div className="resources-weapon-stats">
      {visibleRows.map((row) => (
        <DetailValueRow
          key={row.label}
          label={row.label}
          value={row.value}
          isNumeric={row.isNumeric}
          layout="ledger"
        />
      ))}
      {variant === 'pane' && primaryRows.length > 0 && extraRows.length > 0 && (
        <div className="resources-weapon-stats__toggle-row">
          <button
            type="button"
            className="resources-weapon-stats__toggle"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
          >
            {isExpanded ? 'Less' : 'More weapon details'}
            {isExpanded ? (
              <ChevronUp size={12} aria-hidden="true" />
            ) : (
              <ChevronDown size={12} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function toLabeledArmorStats(armorStats: ItemArmorStats): KeyValuePair[] {
  const labeledStats: KeyValuePair[] = []
  labeledStats.push({ label: 'Type', value: armorStats.armorType })
  if (armorStats.armorBonus !== null)
    labeledStats.push({
      label: 'Armor bonus',
      value: armorStats.armorBonus,
      isNumeric: true,
    })
  if (armorStats.shieldBonus !== null)
    labeledStats.push({
      label: 'Shield bonus',
      value: armorStats.shieldBonus,
      isNumeric: true,
    })
  if (armorStats.maximumDexterityBonus !== null)
    labeledStats.push({
      label: 'Max Dex bonus',
      value: armorStats.maximumDexterityBonus,
      isNumeric: true,
    })
  if (armorStats.arcaneSpellFailurePercent !== null)
    labeledStats.push({
      label: 'Arcane spell failure',
      value: `${armorStats.arcaneSpellFailurePercent}%`,
      isNumeric: true,
    })
  if (armorStats.armorCheckPenalty !== null)
    labeledStats.push({
      label: 'Armor check penalty',
      value: armorStats.armorCheckPenalty,
      isNumeric: true,
    })
  if (armorStats.damageReduction !== null)
    labeledStats.push({
      label: 'Damage reduction',
      value: armorStats.damageReduction,
      isNumeric: true,
    })
  return labeledStats
}

function HoverSourceSummary({
  item,
  onOpenItem,
}: {
  item: Item
  onOpenItem?: (id: number, name: string) => void
}): JSX.Element {
  const sources: Array<{
    key: string
    name: string
    note: string | null
    questId: number | null
    sourceKind: SourceHoverKind | null
    sourceId: number | null
    wikiUrl: string | null
  }> = [
    ...item.quests.map((quest) => ({
      key: `quest-${quest.id}`,
      name: quest.name,
      note: quest.pack,
      questId: quest.id,
      sourceKind: null,
      sourceId: null,
      wikiUrl: null,
    })),
    ...item.adventurePackDrops.map((source) => ({
      key: source.key,
      name: source.name,
      note: 'Anywhere in the pack',
      questId: null,
      sourceKind: source.kind,
      sourceId: source.id,
      wikiUrl: source.wikiUrl,
    })),
    ...item.questChains.map((chain) => ({
      key: `chain-${chain.id}`,
      name: chain.name,
      note: 'Chain end reward',
      questId: null,
      sourceKind: 'questChain' as const,
      sourceId: chain.id,
      wikiUrl: chain.wikiUrl,
    })),
    ...item.sagas.map((saga) => ({
      key: `saga-${saga.id}`,
      name: saga.name,
      note: 'Saga reward',
      questId: null,
      sourceKind: 'saga' as const,
      sourceId: saga.id,
      wikiUrl: saga.wikiUrl,
    })),
    ...item.sourcesBeyondQuests.map((source) => ({
      key: source.key,
      name: source.name,
      note: ITEM_SOURCE_LABELS[source.kind],
      questId: null,
      sourceKind: source.kind,
      sourceId: source.id,
      wikiUrl: source.wikiUrl,
    })),
  ]
  return (
    <div className="resources-hover-rows">
      {sources.slice(0, 3).map((source) => (
        <div className="resources-hover-row" key={source.key}>
          <span>
            {source.questId !== null ? (
              <QuestHoverAnchor questId={source.questId} onOpenItem={onOpenItem}>
                {source.name}
              </QuestHoverAnchor>
            ) : source.sourceKind ? (
              <SourceHoverAnchor
                kind={source.sourceKind}
                id={source.sourceId}
                name={source.name}
                wikiUrl={source.wikiUrl}
                onOpenItem={onOpenItem}
              >
                {source.name}
              </SourceHoverAnchor>
            ) : (
              source.name
            )}
          </span>
          <span>{source.note}</span>
        </div>
      ))}
      <DetailMore count={sources.length - 3} />
    </div>
  )
}

export function ItemDetailCard({
  item,
  variant = 'pane',
  matchingEnchantments = [],
  setDetail,
  onOpenItem,
}: {
  item: Item
  variant?: 'pane' | 'hover'
  matchingEnchantments?: string[]
  setDetail?: SetDetail | null
  onOpenItem?: (id: number, name: string) => void
}): JSX.Element {
  const headerAttributes = toHeaderAttributes(item)
  const labeledArmorStats = item.armorStats ? toLabeledArmorStats(item.armorStats) : []
  const hasLinkedSource =
    item.quests.length > 0 ||
    item.questChains.length > 0 ||
    item.sagas.length > 0 ||
    item.adventurePackDrops.length > 0 ||
    item.sourcesBeyondQuests.length > 0

  return (
    <div
      className={`resources-detail-body${item.weaponStats ? ' resources-detail-body--weapon' : ''}`}
    >
      <DetailCard
        variant={variant}
        header={
          <DetailHeader
            name={item.name}
            kicker={`${item.equipmentSlot} · ${item.type ?? item.category}`}
            wikiUrl={item.wikiUrl}
            wikiPageName={item.name}
            isLegacy={item.isLegacy}
            isCraftable={item.sourcesBeyondQuests.some(
              (source) => source.kind === 'craftingSystem',
            )}
            variant={variant}
          />
        }
        facts={
          <>
            <DetailFact label="ML">
              <span className="num">{item.minimumLevel ?? '—'}</span>
            </DetailFact>
            <DetailFact label="Gear slot">{item.equipmentSlot}</DetailFact>
            <DetailFact label="Augments">
              {item.augmentSlots.length ? (
                <AugmentSlotList augmentSlots={item.augmentSlots} />
              ) : (
                '—'
              )}
            </DetailFact>
            <DetailFact label="Raid">
              {item.quests.some((quest) => quest.isRaid) ? 'Yes' : '—'}
            </DetailFact>
            <DetailFact label="Rare">
              {item.quests.some((quest) => quest.isRareLoot) ||
              item.adventurePackDrops.some((source) => source.isRareLoot) ||
              item.sourcesBeyondQuests.some((source) => source.isRareLoot) ||
              item.questChains.some((chain) => chain.isRareLoot) ||
              item.sagas.some((saga) => saga.isRareLoot)
                ? 'Yes'
                : '—'}
            </DetailFact>
            {item.setName && (
              <DetailFact label="Set">
                {item.setId ? (
                  <SetHoverAnchor setId={item.setId} name={item.setName} onOpenItem={onOpenItem} />
                ) : (
                  item.setName
                )}
              </DetailFact>
            )}
          </>
        }
      >
        {headerAttributes.length > 0 && variant === 'pane' && (
          <KeyValueGrid pairs={headerAttributes} />
        )}
        {item.weaponStats && (
          <WeaponStats
            key={item.id}
            weaponStats={item.weaponStats}
            enhancementBonus={item.enhancementBonus}
            variant={variant}
          />
        )}
        {item.description && <p className="resources-detail-description">{item.description}</p>}
        {variant === 'hover' &&
          item.modifiers.flatMap((modifier) => {
            const damage = damageExpression(modifier)
            return damage
              ? [<DetailValueRow key={modifier.id} label="Damage" value={damage} tone="damage" />]
              : []
          })}
        {variant === 'pane' && labeledArmorStats.length > 0 && (
          <DetailCardSection heading="Armor">
            <StatList stats={labeledArmorStats} />
          </DetailCardSection>
        )}
        <EnchantmentList
          itemName={item.name}
          bonuses={item.bonuses}
          modifiers={item.modifiers}
          effects={item.effects}
          setDetail={setDetail}
          variant={variant}
          matchingEnchantments={matchingEnchantments}
          onOpenItem={onOpenItem}
        />
        {variant === 'pane' && item.clickies.length > 0 && (
          <DetailCardSection heading="Clickies">
            <ul className="resources-clicky-list">
              {item.clickies.map((c) => (
                <li key={c.name} className="resources-clicky-row">
                  <span className="resources-clicky-name">{c.name}</span>
                  {c.description && <p className="resources-bonus-description">{c.description}</p>}
                </li>
              ))}
            </ul>
          </DetailCardSection>
        )}
        {hasLinkedSource ? (
          <DetailCardSection heading={variant === 'hover' ? 'Drops from' : 'Obtained from'}>
            {variant === 'hover' ? (
              <HoverSourceSummary item={item} onOpenItem={onOpenItem} />
            ) : (
              <ul className="resources-quest-list">
                {item.quests.map((quest: LootQuest) => (
                  <li key={quest.id} className="resources-quest-row">
                    <span className="resources-quest-name">
                      <QuestHoverAnchor questId={quest.id} onOpenItem={onOpenItem}>
                        <span className="resources-quest-title">{quest.name}</span>
                      </QuestHoverAnchor>
                      {quest.isRaid && <DropTagChip kind="raid" />}
                      {quest.isRareLoot && <DropTagChip kind="rare" />}
                      {quest.chests.map((chest) => (
                        <span key={chest} className="resources-quest-chest">
                          {sentenceCased(chest)}
                        </span>
                      ))}
                      <WikiLinkIcon pageName={quest.name} />
                    </span>
                    <span className="resources-quest-meta">
                      {[
                        quest.patron,
                        quest.pack,
                        quest.level !== null ? `Level ${quest.level}` : null,
                        quest.isEndReward ? 'End reward' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                ))}
                {item.adventurePackDrops.map((packDrop) => (
                  <ItemSourceRow key={packDrop.key} itemSource={packDrop} onOpenItem={onOpenItem} />
                ))}
                {item.questChains.map((questChain) => (
                  <li key={`chain-${questChain.id}`} className="resources-quest-row">
                    <span className="resources-quest-name">
                      <SourceHoverAnchor
                        kind="questChain"
                        id={questChain.id}
                        name={questChain.name}
                        wikiUrl={questChain.wikiUrl}
                        onOpenItem={onOpenItem}
                      >
                        <span className="resources-quest-title">{questChain.name}</span>
                      </SourceHoverAnchor>
                      {questChain.isRareLoot && <DropTagChip kind="rare" />}
                      <WikiLinkIcon
                        href={questChain.wikiUrl ?? undefined}
                        pageName={questChain.name}
                      />
                    </span>
                    <span className="resources-quest-meta">Chain end reward</span>
                  </li>
                ))}
                {item.sagas.map((saga) => (
                  <li key={`saga-${saga.id}-${saga.tier}`} className="resources-quest-row">
                    <span className="resources-quest-name">
                      <SourceHoverAnchor
                        kind="saga"
                        id={saga.id}
                        name={saga.name}
                        wikiUrl={saga.wikiUrl}
                        onOpenItem={onOpenItem}
                      >
                        <span className="resources-quest-title">{saga.name}</span>
                      </SourceHoverAnchor>
                      {saga.isRareLoot && <DropTagChip kind="rare" />}
                      <WikiLinkIcon href={saga.wikiUrl ?? undefined} pageName={saga.name} />
                    </span>
                    <span className="resources-quest-meta">
                      {['Saga reward', saga.tier ? sentenceCased(saga.tier) : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                ))}
                {item.sourcesBeyondQuests.map((itemSource) => (
                  <ItemSourceRow
                    key={itemSource.key}
                    itemSource={itemSource}
                    onOpenItem={onOpenItem}
                  />
                ))}
              </ul>
            )}
          </DetailCardSection>
        ) : (
          item.dropLocation && (
            <DetailCardSection heading={variant === 'hover' ? 'Drops from' : 'Obtained from'}>
              <p className="resources-detail-description">{item.dropLocation}</p>
            </DetailCardSection>
          )
        )}
        {variant === 'hover' && (
          <DetailCardFooter>Click a row in the list to open it</DetailCardFooter>
        )}
        {variant === 'pane' && (
          <footer className="resources-detail-actions">
            <div className="resources-detail-action-buttons">
              <button
                type="button"
                className="btn-primary"
                disabled
                title="Compare list arrives with Phase 8"
              >
                Add to compare
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled
                title="Gear comparison arrives with Phase 8"
              >
                Compare in Gear
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled
                title="Farm checklist arrives with Phase 10"
              >
                Add to farm list
              </button>
            </div>
            <p className="resources-detail-actions-note">
              Actions arrive with the Gear and Farm checklist phases.
            </p>
          </footer>
        )}
      </DetailCard>
    </div>
  )
}
