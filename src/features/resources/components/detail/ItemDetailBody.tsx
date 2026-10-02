import type { JSX } from 'react'
import { WikiLinkIcon } from '../../../../components'
import { WIKI_COMPARE_WINDOW_NAME, wikiPageUrlFor } from '../../../../lib/wiki/pageLinks'
import { DropTagChip } from '../DropTagChip'
import { AugmentSlotList } from './AugmentSlotList'
import { DetailHeader } from './DetailHeader'
import { EnchantmentList } from './EnchantmentList'
import { DetailSection } from './DetailSection'
import { StatList } from './StatList'
import type { KeyValuePair } from './KeyValueGrid'
import { numberWithPlusSign } from './numberWithPlusSign'
import { sentenceCased } from './sentenceCased'
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

function toHeaderAttributes(
  item: Item,
  augmentsBySlotLabel: Record<string, AugmentSummary[]>,
): KeyValuePair[] {
  const attributes: KeyValuePair[] = []
  attributes.push({ label: 'Slot', value: item.equipmentSlot })
  attributes.push({ label: 'Type', value: item.type ?? item.category })
  if (item.minimumLevel !== null)
    attributes.push({ label: 'Min level', value: item.minimumLevel, isNumeric: true })
  if (item.enhancementBonus !== null) {
    attributes.push({
      label: 'Enhancement',
      value: numberWithPlusSign(item.enhancementBonus),
      isNumeric: true,
    })
  }
  if (item.material) attributes.push({ label: 'Material', value: item.material })
  if (item.requiredRace) attributes.push({ label: 'Race', value: item.requiredRace })
  if (item.setName) attributes.push({ label: 'Set', value: item.setName })
  if (item.provenance === 'wiki') {
    attributes.push({
      label: 'Source',
      value: (
        <a
          href={item.wikiUrl ?? wikiPageUrlFor(item.name)}
          target={WIKI_COMPARE_WINDOW_NAME}
          rel="nofollow"
        >
          DDO Wiki (not yet in DDOBuilderV2)
        </a>
      ),
    })
  }
  if (item.augmentSlots.length > 0) {
    attributes.push({
      label: 'Augment slots',
      value: (
        <AugmentSlotList
          augmentSlots={item.augmentSlots}
          augmentsBySlotLabel={augmentsBySlotLabel}
        />
      ),
    })
  }
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

export function ItemDetailBody({
  item,
  augmentsBySlotLabel,
}: {
  item: Item
  augmentsBySlotLabel: Record<string, AugmentSummary[]>
}): JSX.Element {
  const headerAttributes = toHeaderAttributes(item, augmentsBySlotLabel)
  const labeledWeaponStats = item.weaponStats ? toLabeledWeaponStats(item.weaponStats) : []
  const labeledArmorStats = item.armorStats ? toLabeledArmorStats(item.armorStats) : []
  const hasLinkedSource =
    item.quests.length > 0 ||
    item.questChains.length > 0 ||
    item.sagas.length > 0 ||
    item.adventurePackDrops.length > 0 ||
    item.sourcesBeyondQuests.length > 0

  return (
    <article className="resources-detail-body">
      <DetailHeader
        name={item.name}
        attributes={headerAttributes}
        wikiUrl={item.wikiUrl}
        wikiPageName={item.name}
        isLegacy={item.isLegacy}
      />
      {item.description && <p className="resources-detail-description">{item.description}</p>}
      {labeledWeaponStats.length > 0 && (
        <DetailSection heading="Weapon">
          <StatList stats={labeledWeaponStats} />
        </DetailSection>
      )}
      {labeledArmorStats.length > 0 && (
        <DetailSection heading="Armor">
          <StatList stats={labeledArmorStats} />
        </DetailSection>
      )}
      <EnchantmentList bonuses={item.bonuses} effects={item.effects} />
      {item.clickies.length > 0 && (
        <DetailSection heading="Clickies">
          <ul className="resources-clicky-list">
            {item.clickies.map((c) => (
              <li key={c.name} className="resources-clicky-row">
                <span className="resources-clicky-name">{c.name}</span>
                {c.description && <p className="resources-bonus-description">{c.description}</p>}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
      {hasLinkedSource ? (
        <DetailSection heading="Obtained from">
          <ul className="resources-quest-list">
            {item.quests.map((quest: LootQuest) => (
              <li key={quest.id} className="resources-quest-row">
                <span className="resources-quest-name">
                  <span className="resources-quest-title">{quest.name}</span>
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
                  <WikiLinkIcon href={questChain.wikiUrl ?? undefined} pageName={questChain.name} />
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
        </DetailSection>
      ) : (
        item.dropLocation && (
          <DetailSection heading="Obtained from">
            <p className="resources-detail-description">{item.dropLocation}</p>
          </DetailSection>
        )
      )}
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
    </article>
  )
}
