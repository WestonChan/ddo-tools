import { Fragment, useId, useLayoutEffect, useRef, useState, type JSX, type ReactNode } from 'react'
import {
  StructuredDetailCard,
  DetailMoreButton,
  detailCardSection,
  type DetailCardDefinition,
  type DetailCardFact,
  DetailStats,
  useClearHoverCards,
  WikiLinkIcon,
  type DetailStat,
} from '../../../../components'
import { AugmentCandidateLedger, AugmentSlotList } from './AugmentSlotList'
import { ItemHeaderActions } from './ItemHeaderActions'
import { DETAIL_TITLE_ID } from '../../resourceCategories'
import { EffectListBriefView, EffectListFullView } from './EffectList'
import { itemEffectRows, setEffectRows } from './effectRows'
import { resourceStatusDefinition } from './resourceStatusDefinition'
import { ResourceStatusView } from './ResourceStatusView'
import type { SetDetail } from '../../queries/sets'
import { sentenceCased } from './sentenceCased'
import {
  QuestHoverAnchor,
  SetHoverAnchor,
  SourceHoverAnchor,
  type SourceHoverKind,
} from './ResourceHoverCards'
import type {
  Item,
  ItemSource,
  ItemSourceKind,
  ItemClickie,
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
          <span className="resources-item-source-title focus-ring-proxy focus-ring-proxy--container">
            {children}
          </span>
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

interface ItemStatSection {
  itemId: number
  primaryStats: DetailStat[]
  extraStats: DetailStat[]
  damageReductionBypasses: string[]
}

function itemStatSection(item: Item, kind: ItemDetailKind): ItemStatSection {
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
  return { itemId: item.id, primaryStats, extraStats, damageReductionBypasses }
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

interface ItemSourceEntry {
  key: string
  name: string
  descriptorParts: string[]
  chests: string[]
  hasWikiPage: boolean
  isRaid: boolean
  isRareLoot: boolean
  level: number | null
  epicLevel: number | null
  pack: string | null
  patron: string | null
  questId: number | null
  sourceKind: SourceHoverKind | null
  sourceId: number | null
  wikiUrl: string | null
  onOpenItem?: (id: number, name: string) => void
}

function itemSourceEntries(
  item: Item,
  onOpenItem?: (id: number, name: string) => void,
): ItemSourceEntry[] {
  const sourceEntry = (source: ItemSource): ItemSourceEntry => ({
    key: source.key,
    name: source.name,
    descriptorParts: itemSourceDescriptorParts(source),
    chests: [],
    hasWikiPage:
      source.wikiUrl !== null || SOURCE_KINDS_WITH_WIKI_PAGE_NAMED_AFTER_SOURCE.has(source.kind),
    isRaid: false,
    isRareLoot: source.isRareLoot,
    level: null,
    epicLevel: null,
    pack: null,
    patron: null,
    questId: null,
    sourceKind: source.kind,
    sourceId: source.id,
    wikiUrl: source.wikiUrl,
    onOpenItem,
  })
  return [
    ...item.quests.map((quest) => ({
      key: `quest-${quest.id}`,
      name: quest.name,
      descriptorParts: [
        ...quest.chests.map(sentenceCased),
        ...(quest.isEndReward ? ['End reward'] : []),
      ],
      chests: quest.chests.map(sentenceCased),
      hasWikiPage: true,
      isRaid: quest.isRaid,
      isRareLoot: quest.isRareLoot,
      level: quest.level,
      epicLevel: quest.epicLevel,
      pack: quest.pack,
      patron: quest.patron,
      questId: quest.id,
      sourceKind: null,
      sourceId: null,
      wikiUrl: null,
      onOpenItem,
    })),
    ...item.adventurePackDrops.map(sourceEntry),
    ...item.questChains.map((chain) => ({
      key: `chain-${chain.id}`,
      name: chain.name,
      descriptorParts: ['Chain end reward'],
      chests: [],
      hasWikiPage: true,
      isRaid: false,
      isRareLoot: chain.isRareLoot,
      level: null,
      epicLevel: null,
      pack: null,
      patron: null,
      questId: null,
      sourceKind: 'questChain' as const,
      sourceId: chain.id,
      wikiUrl: chain.wikiUrl,
      onOpenItem,
    })),
    ...item.sagas.map((saga) => ({
      key: `saga-${saga.id}-${saga.tier}`,
      name: saga.name,
      descriptorParts: ['Saga reward', ...(saga.tier ? [sentenceCased(saga.tier)] : [])],
      chests: [],
      hasWikiPage: true,
      isRaid: false,
      isRareLoot: saga.isRareLoot,
      level: null,
      epicLevel: null,
      pack: null,
      patron: null,
      questId: null,
      sourceKind: 'saga' as const,
      sourceId: saga.id,
      wikiUrl: saga.wikiUrl,
      onOpenItem,
    })),
    ...item.sourcesBeyondQuests.map(sourceEntry),
  ]
}

function ItemSourceName({ entry }: { entry: ItemSourceEntry }): JSX.Element {
  if (entry.questId !== null)
    return (
      <QuestHoverAnchor questId={entry.questId} onOpenItem={entry.onOpenItem}>
        {entry.name}
      </QuestHoverAnchor>
    )
  if (entry.sourceKind)
    return (
      <SourceHoverAnchor
        kind={entry.sourceKind}
        id={entry.sourceId}
        name={entry.name}
        wikiUrl={entry.wikiUrl}
        onOpenItem={entry.onOpenItem}
      >
        {entry.name}
      </SourceHoverAnchor>
    )
  return <>{entry.name}</>
}

function ItemSourcesFullView({ entries }: { entries: readonly ItemSourceEntry[] }): JSX.Element {
  return (
    <ul className="resources-item-source-list">
      {entries.map((entry) => (
        <ObtainedFromRow
          key={entry.key}
          wikiPageName={entry.hasWikiPage ? entry.name : undefined}
          wikiUrl={entry.wikiUrl}
          descriptorParts={entry.descriptorParts.map((part) =>
            entry.chests.includes(part) ? (
              <span key={part} className="resources-item-source-chest">
                {part}
              </span>
            ) : (
              part
            ),
          )}
          isRaid={entry.isRaid}
          isRareLoot={entry.isRareLoot}
          level={entry.level}
          epicLevel={entry.epicLevel}
          pack={entry.pack}
          patron={entry.patron}
        >
          <ItemSourceName entry={entry} />
        </ObtainedFromRow>
      ))}
    </ul>
  )
}

function ItemSourcesBriefView({ entries }: { entries: readonly ItemSourceEntry[] }): JSX.Element {
  return (
    <div className="resources-hover-rows">
      {entries.map((entry) => (
        <div
          key={entry.key}
          className="resources-hover-row resources-item-source-brief-row hover-card-row"
        >
          <span>
            <ItemSourceName entry={entry} />
          </span>
          <span>
            {[
              ...entry.descriptorParts,
              ...(entry.isRaid ? ['Raid'] : []),
              ...(entry.isRareLoot ? ['Rare'] : []),
              ...([entry.level, entry.epicLevel].filter((level) => level !== null).length
                ? [
                    `Level ${[entry.level, entry.epicLevel].filter((level) => level !== null).join(' / ')}`,
                  ]
                : []),
              entry.pack,
              entry.patron,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      ))}
    </div>
  )
}

function ItemDescriptionView({ entries }: { entries: readonly string[] }): JSX.Element {
  return (
    <>
      {entries.map((description, index) => (
        <p key={index} className="resources-detail-description">
          {description}
        </p>
      ))}
    </>
  )
}

function ItemDescriptionBriefView({ entries }: { entries: readonly string[] }): JSX.Element {
  const descriptionRef = useRef<HTMLParagraphElement | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  useLayoutEffect(() => {
    const description = descriptionRef.current
    if (!description) return
    const measureOverflow = (): void => {
      if (!isExpanded) setHasOverflow(description.scrollHeight > description.clientHeight)
    }
    measureOverflow()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measureOverflow)
    observer.observe(description)
    return () => observer.disconnect()
  }, [entries, isExpanded])
  return (
    <>
      <p
        ref={descriptionRef}
        className={`resources-detail-description resources-detail-description--brief${isExpanded ? ' resources-detail-description--expanded' : ''}`}
      >
        {entries[0]}
      </p>
      {(hasOverflow || isExpanded) && (
        <DetailMoreButton
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((wasExpanded) => !wasExpanded)}
          collapsedLabel="Show more"
        />
      )}
    </>
  )
}

function ItemStatsView({ entries }: { entries: readonly ItemStatSection[] }): JSX.Element {
  return (
    <>
      {entries.map(({ itemId, primaryStats, extraStats, damageReductionBypasses }) => (
        <DetailStats
          key={itemId}
          primaryStats={primaryStats}
          extraStats={extraStats}
          damageReductionBypasses={damageReductionBypasses}
        />
      ))}
    </>
  )
}

function ItemClickiesView({ entries }: { entries: readonly ItemClickie[] }): JSX.Element {
  return (
    <ul className="resources-clicky-list">
      {entries.map((clickie) => (
        <li key={clickie.name} className="resources-clicky-row">
          <span className="resources-clicky-name">{clickie.name}</span>
          {clickie.description && (
            <p className="resources-bonus-description">{clickie.description}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

interface ItemDetailCardProps {
  item: Item | null
  matchingBonuses?: string[]
  setDetail?: SetDetail | null
  onOpenItem?: (id: number, name: string) => void
  status?: ReactNode
}

function useItemDetailDefinition({
  item,
  matchingBonuses = [],
  setDetail,
  onOpenItem,
  status,
}: ItemDetailCardProps): DetailCardDefinition {
  const [expandedSlotSortOrder, setExpandedSlotSortOrder] = useState<number | null>(null)
  const expandedSocketButtonRef = useRef<HTMLButtonElement | null>(null)
  const clearHoverCards = useClearHoverCards()
  const augmentLedgerId = useId()
  const expandedSlot = item?.augmentSlots.find((slot) => slot.sortOrder === expandedSlotSortOrder)
  const displayedSetName = item?.setName?.trim() || null

  function closeExpandedSocket(): void {
    expandedSocketButtonRef.current?.focus()
    clearHoverCards()
    setExpandedSlotSortOrder(null)
  }

  const facts: DetailCardFact[] = [
    {
      label: 'ML',
      value: item?.minimumLevel == null ? null : <span className="num">{item.minimumLevel}</span>,
    },
    { label: 'Gear slot', value: item?.equipmentSlot.trim() || null },
    { label: 'Raid', value: item?.quests.some((quest) => quest.isRaid) ? 'Yes' : null },
    {
      label: 'Rare',
      value:
        item?.quests.some((quest) => quest.isRareLoot) ||
        item?.adventurePackDrops.some((source) => source.isRareLoot) ||
        item?.sourcesBeyondQuests.some((source) => source.isRareLoot) ||
        item?.questChains.some((chain) => chain.isRareLoot) ||
        item?.sagas.some((saga) => saga.isRareLoot)
          ? 'Yes'
          : null,
    },
    {
      label: 'Set',
      value: displayedSetName ? (
        item?.setId ? (
          <SetHoverAnchor setId={item.setId} name={displayedSetName} onOpenItem={onOpenItem} />
        ) : (
          displayedSetName
        )
      ) : null,
    },
    {
      label: 'Augments',
      value: item?.augmentSlots.length ? (
        <AugmentSlotList
          augmentSlots={item.augmentSlots}
          expandedSlotSortOrder={expandedSlotSortOrder}
          ledgerId={augmentLedgerId}
          expandedSocketButtonRef={expandedSocketButtonRef}
          onToggleSlot={(sortOrder) =>
            setExpandedSlotSortOrder((current) => (current === sortOrder ? null : sortOrder))
          }
          onClose={closeExpandedSocket}
        />
      ) : null,
    },
  ]
  if (!item)
    return resourceStatusDefinition({
      kicker: '',
      name: 'Item',
      facts,
      status: status ?? 'Item unavailable',
    })
  const detailKind = itemDetailKind(item)
  const statSection = itemStatSection(item, detailKind)
  const enchantments = [
    ...itemEffectRows({
      item,
      effects: item.effects,
      matchingBonuses,
      itemName: item.name,
      modifiers: item.modifiers,
      onOpenItem,
    }),
    ...(setDetail ? setEffectRows(setDetail, matchingBonuses, onOpenItem) : []),
  ]
  const sources = itemSourceEntries(item, onOpenItem)
  const sections = [
    detailCardSection({
      key: 'description',
      entries: item.description ? [item.description] : [],
      FullView: ItemDescriptionView,
      BriefView: ItemDescriptionBriefView,
    }),
    detailCardSection({
      key: 'stats',
      entries:
        statSection.primaryStats.length ||
        statSection.extraStats.length ||
        statSection.damageReductionBypasses.length
          ? [statSection]
          : [],
      FullView: ItemStatsView,
    }),
    detailCardSection({
      key: 'enchantments',
      entries: enchantments,
      FullView: EffectListFullView,
      BriefView: EffectListBriefView,
      briefEntryLimit: 5,
    }),
    detailCardSection({
      key: 'clickies',
      heading: 'Clickies',
      entries: item.clickies,
      FullView: ItemClickiesView,
    }),
    detailCardSection({
      key: 'sources',
      heading: 'Obtained from',
      entries: sources,
      FullView: ItemSourcesFullView,
      BriefView: ItemSourcesBriefView,
      briefEntryLimit: 3,
    }),
    detailCardSection({
      key: 'source-location',
      heading: 'Obtained from',
      entries: sources.length === 0 && item.dropLocation ? [item.dropLocation] : [],
      FullView: ItemDescriptionView,
    }),
    detailCardSection({
      key: 'set-status',
      entries: status ? [status] : [],
      FullView: ResourceStatusView,
    }),
  ]
  const badges = (
    <>
      {item.isLegacy && (
        <span className="resources-chip" data-kind="legacy">
          Legacy
        </span>
      )}
      {item.sourcesBeyondQuests.some((source) => source.kind === 'craftingSystem') && (
        <span className="resources-chip" data-kind="craftable">
          Craftable
        </span>
      )}
    </>
  )
  const paneFooter = (
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
  )
  return {
    kicker: item.type ? `${item.equipmentSlot} · ${item.type}` : item.category,
    name: item.name,
    titleId: DETAIL_TITLE_ID,
    badges,
    facts,
    sections,
    paneActions: (
      <ItemHeaderActions name={item.name} wikiUrl={item.wikiUrl} wikiPageName={item.name} />
    ),
    paneFooter,
    afterHeader: expandedSlot ? (
      <AugmentCandidateLedger
        slot={expandedSlot}
        ledgerId={augmentLedgerId}
        onClose={closeExpandedSocket}
      />
    ) : null,
  }
}

export function ItemDetailCard(props: ItemDetailCardProps): JSX.Element {
  const definition = useItemDetailDefinition(props)
  return (
    <div
      className={`resources-detail-body${props.item && itemDetailKind(props.item) === 'weapon' ? ' resources-detail-body--weapon' : ''}`}
    >
      <StructuredDetailCard variant="pane" {...definition} />
    </div>
  )
}

export function ItemHoverCard(props: ItemDetailCardProps): JSX.Element {
  const definition = useItemDetailDefinition(props)
  return <StructuredDetailCard variant="hover" {...definition} />
}
