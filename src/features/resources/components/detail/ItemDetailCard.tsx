import type { JSX } from 'react'
import {
  DetailCard,
  DetailCardFooter,
  DetailCardSection,
  DetailFact,
  DetailMore,
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
import { QuestHoverAnchor, SetHoverAnchor } from './ResourceHoverCards'
import type {
  AugmentSummary,
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

function ItemSourceRow({ itemSource }: { itemSource: ItemSource }): JSX.Element {
  const metaLine = itemSourceMetaLine(itemSource)
  const hasWikiPage =
    itemSource.wikiUrl !== null ||
    SOURCE_KINDS_WITH_WIKI_PAGE_NAMED_AFTER_SOURCE.has(itemSource.kind)
  return (
    <li className="resources-quest-row">
      <span className="resources-quest-name">
        <span className="resources-quest-title">{itemSource.name}</span>
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

function toLabeledWeaponStats(weaponStats: ItemWeaponStats): KeyValuePair[] {
  const labeledStats: KeyValuePair[] = []
  if (weaponStats.damage)
    labeledStats.push({ label: 'Damage', value: weaponStats.damage, isNumeric: true })
  if (weaponStats.critical)
    labeledStats.push({
      label: 'Critical',
      value: weaponStats.critical,
      isNumeric: true,
    })
  labeledStats.push({ label: 'Type', value: weaponStats.weaponType })
  if (weaponStats.proficiency)
    labeledStats.push({ label: 'Proficiency', value: weaponStats.proficiency })
  if (weaponStats.handedness)
    labeledStats.push({ label: 'Handedness', value: weaponStats.handedness })
  return labeledStats
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
  const sources = [
    ...item.quests.map((quest) => ({
      key: `quest-${quest.id}`,
      name: quest.name,
      note: quest.pack,
      questId: quest.id,
    })),
    ...item.adventurePackDrops.map((source) => ({
      key: source.key,
      name: source.name,
      note: 'Anywhere in the pack',
      questId: null,
    })),
    ...item.questChains.map((chain) => ({
      key: `chain-${chain.id}`,
      name: chain.name,
      note: 'Chain end reward',
      questId: null,
    })),
    ...item.sagas.map((saga) => ({
      key: `saga-${saga.id}`,
      name: saga.name,
      note: 'Saga reward',
      questId: null,
    })),
    ...item.sourcesBeyondQuests.map((source) => ({
      key: source.key,
      name: source.name,
      note: ITEM_SOURCE_LABELS[source.kind],
      questId: null,
    })),
  ]
  return (
    <div className="resources-hover-rows">
      {sources.slice(0, 3).map((source) => (
        <div className="resources-hover-row" key={source.key}>
          <span>
            {source.questId === null ? (
              source.name
            ) : (
              <QuestHoverAnchor questId={source.questId} onOpenItem={onOpenItem}>
                {source.name}
              </QuestHoverAnchor>
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
  augmentsBySlotLabel,
  variant = 'drawer',
  matchingEnchantments = [],
  setDetail,
  onOpenItem,
}: {
  item: Item
  augmentsBySlotLabel: Record<string, AugmentSummary[]>
  variant?: 'drawer' | 'hover'
  matchingEnchantments?: string[]
  setDetail?: SetDetail | null
  onOpenItem?: (id: number, name: string) => void
}): JSX.Element {
  const headerAttributes = toHeaderAttributes(item)
  const labeledWeaponStats = item.weaponStats ? toLabeledWeaponStats(item.weaponStats) : []
  const labeledArmorStats = item.armorStats ? toLabeledArmorStats(item.armorStats) : []
  const hasLinkedSource =
    item.quests.length > 0 ||
    item.questChains.length > 0 ||
    item.sagas.length > 0 ||
    item.adventurePackDrops.length > 0 ||
    item.sourcesBeyondQuests.length > 0

  return (
    <div className="resources-detail-body">
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
                <AugmentSlotList
                  augmentSlots={item.augmentSlots}
                  augmentsBySlotLabel={augmentsBySlotLabel}
                />
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
        {headerAttributes.length > 0 && variant === 'drawer' && (
          <KeyValueGrid pairs={headerAttributes} />
        )}
        {item.description && <p className="resources-detail-description">{item.description}</p>}
        {variant === 'drawer' && labeledWeaponStats.length > 0 && (
          <DetailCardSection heading="Weapon">
            <StatList stats={labeledWeaponStats} />
          </DetailCardSection>
        )}
        {variant === 'drawer' && labeledArmorStats.length > 0 && (
          <DetailCardSection heading="Armor">
            <StatList stats={labeledArmorStats} />
          </DetailCardSection>
        )}
        <EnchantmentList
          bonuses={item.bonuses}
          effects={item.effects}
          setDetail={setDetail}
          variant={variant}
          matchingEnchantments={matchingEnchantments}
          onOpenItem={onOpenItem}
        />
        {variant === 'drawer' && item.clickies.length > 0 && (
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
                  <ItemSourceRow key={packDrop.key} itemSource={packDrop} />
                ))}
                {item.questChains.map((questChain) => (
                  <li key={`chain-${questChain.id}`} className="resources-quest-row">
                    <span className="resources-quest-name">
                      <span className="resources-quest-title">{questChain.name}</span>
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
                      <span className="resources-quest-title">{saga.name}</span>
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
                  <ItemSourceRow key={itemSource.key} itemSource={itemSource} />
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
        {variant === 'drawer' && (
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
