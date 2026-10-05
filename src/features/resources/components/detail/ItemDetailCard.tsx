import { Fragment, useId, useRef, useState, type JSX, type ReactNode } from 'react'
import {
  DetailCard,
  DetailCardFooter,
  DetailCardSection,
  DetailFact,
  DetailStats,
  DetailMore,
  DetailValueRow,
  useClearHoverCards,
  WikiLinkIcon,
  type DetailStat,
} from '../../../../components'
import { AugmentCandidateLedger, AugmentSlotList } from './AugmentSlotList'
import { DetailHeader } from './DetailHeader'
import { EffectList } from './EffectList'
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

function itemSourceDescriptorParts(itemSource: ItemSource): string[] {
  return [
    ITEM_SOURCE_LABELS[itemSource.kind],
    itemSource.vendorLocation,
    itemSource.cost,
    itemSource.chest ? sentenceCased(itemSource.chest) : null,
  ].filter((descriptorPart): descriptorPart is string => Boolean(descriptorPart))
}

const SOURCE_KINDS_WITH_WIKI_PAGE_NAMED_AFTER_SOURCE: ReadonlySet<ItemSourceKind> = new Set([
  'adventurePack',
])

function ObtainedFromRow({
  children,
  wikiPageName,
  wikiUrl,
  descriptorParts,
  isRaid = false,
  isRareLoot = false,
  level = null,
  epicLevel = null,
  pack = null,
  patron = null,
}: {
  children: ReactNode
  wikiPageName?: string
  wikiUrl?: string | null
  descriptorParts: ReactNode[]
  isRaid?: boolean
  isRareLoot?: boolean
  level?: number | null
  epicLevel?: number | null
  pack?: string | null
  patron?: string | null
}): JSX.Element {
  const levelNumbers = [level, epicLevel].filter(
    (questLevel): questLevel is number => questLevel !== null,
  )
  const levelNumbersText = levelNumbers.length > 0 ? levelNumbers.join(' / ') : null
  const locationText = [pack, patron].filter(Boolean).join(' › ')
  const levelHint =
    level !== null && epicLevel !== null ? `Heroic ${level}, epic ${epicLevel}` : undefined
  return (
    <li className="resources-item-source-row">
      <div className="resources-item-source-left">
        <div className="resources-item-source-name">
          <span className="resources-item-source-title">{children}</span>
          {wikiPageName && (
            <WikiLinkIcon
              href={wikiUrl ?? undefined}
              pageName={wikiPageName}
              icon="external"
              hintText="Open on ddowiki"
            />
          )}
        </div>
        {(descriptorParts.length > 0 || isRaid || isRareLoot) && (
          <div className="resources-item-source-details">
            {descriptorParts.map((descriptorPart, index) => (
              <Fragment key={index}>
                {index > 0 && <span className="resources-item-source-separator">·</span>}
                <span className="resources-item-source-descriptor">{descriptorPart}</span>
              </Fragment>
            ))}
            {isRaid && (
              <>
                {descriptorParts.length > 0 && (
                  <span className="resources-item-source-separator">·</span>
                )}
                <span className="resources-item-source-raid">Raid</span>
              </>
            )}
            {isRareLoot && (
              <>
                {(descriptorParts.length > 0 || isRaid) && (
                  <span className="resources-item-source-separator">·</span>
                )}
                <span className="resources-item-source-rare">Rare</span>
              </>
            )}
          </div>
        )}
      </div>
      {(levelNumbersText || locationText) && (
        <div className="resources-item-source-right">
          {levelNumbersText && (
            <span className="resources-item-source-level" data-tip={levelHint}>
              Level <span className="num">{levelNumbersText}</span>
            </span>
          )}
          {locationText && <span className="resources-item-source-location">{locationText}</span>}
        </div>
      )}
    </li>
  )
}

function ItemSourceRow({
  itemSource,
  onOpenItem,
}: {
  itemSource: ItemSource
  onOpenItem?: (id: number, name: string) => void
}): JSX.Element {
  const hasWikiPage =
    itemSource.wikiUrl !== null ||
    SOURCE_KINDS_WITH_WIKI_PAGE_NAMED_AFTER_SOURCE.has(itemSource.kind)
  return (
    <ObtainedFromRow
      wikiPageName={hasWikiPage ? itemSource.name : undefined}
      wikiUrl={itemSource.wikiUrl}
      descriptorParts={itemSourceDescriptorParts(itemSource)}
      isRareLoot={itemSource.isRareLoot}
    >
      <SourceHoverAnchor
        kind={itemSource.kind}
        id={itemSource.id}
        name={itemSource.name}
        wikiUrl={itemSource.wikiUrl}
        onOpenItem={onOpenItem}
      >
        {itemSource.name}
      </SourceHoverAnchor>
    </ObtainedFromRow>
  )
}

type ItemDetailKind = 'shield' | 'weapon' | 'armor' | 'other'

function itemDetailKind(item: Item): ItemDetailKind {
  if (item.armorStats && (item.category === 'Shield' || item.armorStats.shieldBonus !== null))
    return 'shield'
  if (item.weaponStats) return 'weapon'
  if (item.armorStats) return 'armor'
  return 'other'
}

function toItemAttributeStats(item: Item): DetailStat[] {
  const attributes: DetailStat[] = []
  if (item.material) attributes.push({ label: 'Material', value: item.material, isNumeric: false })
  if (item.requiredRace)
    attributes.push({ label: 'Race', value: item.requiredRace, isNumeric: false })
  return attributes
}

const ABILITY_ABBREVIATION_BY_NAME: Readonly<Record<string, string>> = {
  Strength: 'STR',
  Dexterity: 'DEX',
  Constitution: 'CON',
  Intelligence: 'INT',
  Wisdom: 'WIS',
  Charisma: 'CHA',
}

function toPrimaryWeaponStats(
  weaponStats: ItemWeaponStats,
  enhancementBonus: number | null,
): DetailStat[] {
  const primaryStats: DetailStat[] = []
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
    primaryStats.push({ label: 'Damage', value: `${multipliedDice}${bonus}`, isNumeric: true })
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
  if (range) primaryStats.push({ label: 'Crit range', value: range, isNumeric: true })
  if (multiplier)
    primaryStats.push({ label: 'Crit multiplier', value: `×${multiplier}`, isNumeric: true })
  if (!range && !multiplier && critical) {
    primaryStats.push({ label: 'Critical', value: critical, isNumeric: false })
  }
  for (const [label, modifier] of [
    ['Attack mod', weaponStats.attackModifier],
    ['Damage mod', weaponStats.damageModifier],
  ] as const) {
    const ability = modifier?.trim()
    if (ability && ABILITY_ABBREVIATION_BY_NAME[ability]) {
      primaryStats.push({
        label,
        value: ABILITY_ABBREVIATION_BY_NAME[ability],
        isNumeric: false,
        hint: ability,
      })
    }
  }
  return primaryStats
}

function toExtraWeaponStats(weaponStats: ItemWeaponStats): DetailStat[] {
  const rows: DetailStat[] = []
  const details = [
    ['Type', weaponStats.weaponType],
    ['Proficiency', weaponStats.proficiency],
    ['Handedness', weaponStats.handedness],
  ] as const
  for (const [label, rawValue] of details) {
    const value = rawValue?.trim()
    if (value) rows.push({ label, value, isNumeric: false })
  }
  return rows
}

function ItemDetailStats({ item, kind }: { item: Item; kind: ItemDetailKind }): JSX.Element | null {
  const itemAttributes = toItemAttributeStats(item)
  const materialStats = itemAttributes.filter((stat) => stat.label === 'Material')
  const labeledArmorStats = item.armorStats ? toLabeledArmorStats(item.armorStats) : []
  const isShield = kind === 'shield'
  let primaryStats: DetailStat[] = []
  let extraStats: DetailStat[] = itemAttributes
  const damageReductionBypasses = item.weaponStats?.damageReductionBypasses ?? []
  if (kind === 'armor' || kind === 'shield') {
    const primaryLabels = isShield
      ? ['Shield bonus', 'Max Dex bonus']
      : ['Armor bonus', 'Max Dex bonus']
    const extraLabels = ['Arcane spell failure', 'Armor check penalty', 'Damage reduction']
    primaryStats = [
      ...primaryLabels.flatMap((label) => labeledArmorStats.filter((stat) => stat.label === label)),
    ]
    extraStats = [
      ...extraLabels.flatMap((label) => labeledArmorStats.filter((stat) => stat.label === label)),
      ...materialStats,
    ]
  } else if (kind === 'weapon' && item.weaponStats) {
    primaryStats = toPrimaryWeaponStats(item.weaponStats, item.enhancementBonus)
    extraStats = [...toExtraWeaponStats(item.weaponStats), ...materialStats]
  }
  return (
    <DetailStats
      primaryStats={primaryStats}
      extraStats={extraStats}
      damageReductionBypasses={damageReductionBypasses}
    />
  )
}

function toLabeledArmorStats(armorStats: ItemArmorStats): DetailStat[] {
  const labeledStats: DetailStat[] = []
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
      displayLabel: 'Spell failure',
      value: `${armorStats.arcaneSpellFailurePercent}%`,
      isNumeric: true,
    })
  if (armorStats.armorCheckPenalty !== null)
    labeledStats.push({
      label: 'Armor check penalty',
      displayLabel: 'Check penalty',
      value: armorStats.armorCheckPenalty,
      isNumeric: true,
    })
  if (armorStats.damageReduction !== null)
    labeledStats.push({
      label: 'Damage reduction',
      displayLabel: 'DR',
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
        <div className="resources-hover-row hover-card-row" key={source.key}>
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
  matchingBonuses = [],
  setDetail,
  onOpenItem,
}: {
  item: Item
  variant?: 'pane' | 'hover'
  matchingBonuses?: string[]
  setDetail?: SetDetail | null
  onOpenItem?: (id: number, name: string) => void
}): JSX.Element {
  const [expandedSlotSortOrder, setExpandedSlotSortOrder] = useState<number | null>(null)
  const expandedSocketButtonRef = useRef<HTMLButtonElement | null>(null)
  const clearHoverCards = useClearHoverCards()
  const augmentLedgerId = useId()
  const expandedSlot = item.augmentSlots.find((slot) => slot.sortOrder === expandedSlotSortOrder)
  const displayedSetName = item.setName?.trim() || null
  const detailKind = itemDetailKind(item)
  const hasLinkedSource =
    item.quests.length > 0 ||
    item.questChains.length > 0 ||
    item.sagas.length > 0 ||
    item.adventurePackDrops.length > 0 ||
    item.sourcesBeyondQuests.length > 0

  function closeExpandedSocket(): void {
    expandedSocketButtonRef.current?.focus()
    clearHoverCards()
    setExpandedSlotSortOrder(null)
  }

  return (
    <div
      className={`resources-detail-body${detailKind === 'weapon' ? ' resources-detail-body--weapon' : ''}`}
    >
      <DetailCard
        variant={variant}
        header={
          <DetailHeader
            name={item.name}
            kicker={item.type ? `${item.equipmentSlot} · ${item.type}` : item.category}
            wikiUrl={item.wikiUrl}
            wikiPageName={item.name}
            isLegacy={item.isLegacy}
            isCraftable={item.sourcesBeyondQuests.some(
              (source) => source.kind === 'craftingSystem',
            )}
            variant={variant}
            facts={
              <>
                <DetailFact label="ML">
                  {item.minimumLevel === null ? null : (
                    <span className="num">{item.minimumLevel}</span>
                  )}
                </DetailFact>
                <DetailFact label="Gear slot">{item.equipmentSlot.trim() || null}</DetailFact>
                <DetailFact label="Raid">
                  {item.quests.some((quest) => quest.isRaid) ? 'Yes' : null}
                </DetailFact>
                <DetailFact label="Rare">
                  {item.quests.some((quest) => quest.isRareLoot) ||
                  item.adventurePackDrops.some((source) => source.isRareLoot) ||
                  item.sourcesBeyondQuests.some((source) => source.isRareLoot) ||
                  item.questChains.some((chain) => chain.isRareLoot) ||
                  item.sagas.some((saga) => saga.isRareLoot)
                    ? 'Yes'
                    : null}
                </DetailFact>
                <DetailFact label="Set">
                  {displayedSetName ? (
                    item.setId ? (
                      <SetHoverAnchor
                        setId={item.setId}
                        name={displayedSetName}
                        onOpenItem={onOpenItem}
                      />
                    ) : (
                      displayedSetName
                    )
                  ) : null}
                </DetailFact>
                <DetailFact label="Augments">
                  {item.augmentSlots.length > 0 ? (
                    <AugmentSlotList
                      augmentSlots={item.augmentSlots}
                      expandedSlotSortOrder={expandedSlotSortOrder}
                      ledgerId={augmentLedgerId}
                      expandedSocketButtonRef={expandedSocketButtonRef}
                      onToggleSlot={(sortOrder) =>
                        setExpandedSlotSortOrder((current) =>
                          current === sortOrder ? null : sortOrder,
                        )
                      }
                      onClose={closeExpandedSocket}
                    />
                  ) : null}
                </DetailFact>
              </>
            }
          />
        }
        afterHeader={
          expandedSlot && (
            <AugmentCandidateLedger
              slot={expandedSlot}
              ledgerId={augmentLedgerId}
              onClose={closeExpandedSocket}
            />
          )
        }
      >
        {variant === 'pane' && item.description && (
          <p className="resources-detail-description">{item.description}</p>
        )}
        <ItemDetailStats key={item.id} item={item} kind={detailKind} />
        {variant === 'hover' &&
          item.modifiers.flatMap((modifier) => {
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
        <EffectList
          key={`effects-${item.id}`}
          item={item}
          itemName={item.name}
          modifiers={item.modifiers}
          effects={item.effects}
          setDetail={setDetail}
          variant={variant}
          matchingBonuses={matchingBonuses}
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
              <ul className="resources-item-source-list">
                {item.quests.map((quest: LootQuest) => (
                  <ObtainedFromRow
                    key={quest.id}
                    wikiPageName={quest.name}
                    descriptorParts={[
                      ...quest.chests.map((chest) => (
                        <span key={chest} className="resources-item-source-chest">
                          {sentenceCased(chest)}
                        </span>
                      )),
                      ...(quest.isEndReward ? ['End reward'] : []),
                    ]}
                    isRaid={quest.isRaid}
                    isRareLoot={quest.isRareLoot}
                    level={quest.level}
                    epicLevel={quest.epicLevel}
                    pack={quest.pack}
                    patron={quest.patron}
                  >
                    <QuestHoverAnchor questId={quest.id} onOpenItem={onOpenItem}>
                      {quest.name}
                    </QuestHoverAnchor>
                  </ObtainedFromRow>
                ))}
                {item.adventurePackDrops.map((packDrop) => (
                  <ItemSourceRow key={packDrop.key} itemSource={packDrop} onOpenItem={onOpenItem} />
                ))}
                {item.questChains.map((questChain) => (
                  <ObtainedFromRow
                    key={`chain-${questChain.id}`}
                    wikiPageName={questChain.name}
                    wikiUrl={questChain.wikiUrl}
                    descriptorParts={['Chain end reward']}
                    isRareLoot={questChain.isRareLoot}
                  >
                    <SourceHoverAnchor
                      kind="questChain"
                      id={questChain.id}
                      name={questChain.name}
                      wikiUrl={questChain.wikiUrl}
                      onOpenItem={onOpenItem}
                    >
                      {questChain.name}
                    </SourceHoverAnchor>
                  </ObtainedFromRow>
                ))}
                {item.sagas.map((saga) => (
                  <ObtainedFromRow
                    key={`saga-${saga.id}-${saga.tier}`}
                    wikiPageName={saga.name}
                    wikiUrl={saga.wikiUrl}
                    descriptorParts={[
                      'Saga reward',
                      ...(saga.tier ? [sentenceCased(saga.tier)] : []),
                    ]}
                    isRareLoot={saga.isRareLoot}
                  >
                    <SourceHoverAnchor
                      kind="saga"
                      id={saga.id}
                      name={saga.name}
                      wikiUrl={saga.wikiUrl}
                      onOpenItem={onOpenItem}
                    >
                      {saga.name}
                    </SourceHoverAnchor>
                  </ObtainedFromRow>
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
