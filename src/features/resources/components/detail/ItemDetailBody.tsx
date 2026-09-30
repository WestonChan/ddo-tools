import type { JSX } from 'react'
import { WikiLinkIcon } from '../../../../components'
import { WIKI_COMPARE_WINDOW_NAME, wikiPageUrlFor } from '../../../../lib/wiki/pageLinks'
import { DropTagChip } from '../DropTagChip'
import { AugmentSlotList } from './AugmentSlotList'
import { DetailHeader } from './DetailHeader'
import { EnchantmentList } from './EnchantmentList'
import { DetailSection } from './DetailSection'
import { StatList, type LabeledStat } from './StatList'
import type { KeyValuePair } from './KeyValueGrid'
import { numberWithPlusSign } from './numberWithPlusSign'
import { sentenceCased } from './sentenceCased'
import type {
  AugmentSummary,
  Item,
  LootQuest,
  ItemWeaponStats,
  ItemArmorStats,
} from '../../queries/items'

function toHeaderAttributes(
  item: Item,
  augmentsBySlotLabel: Record<string, AugmentSummary[]>,
): KeyValuePair[] {
  const attributes: KeyValuePair[] = []
  attributes.push({ label: 'Slot', value: item.equipmentSlot })
  attributes.push({ label: 'Type', value: item.type ?? item.category })
  if (item.minimumLevel !== null) attributes.push({ label: 'Min level', value: item.minimumLevel })
  if (item.enhancementBonus !== null) {
    attributes.push({ label: 'Enhancement', value: numberWithPlusSign(item.enhancementBonus) })
  }
  if (item.material) attributes.push({ label: 'Material', value: item.material })
  if (item.requiredRace) attributes.push({ label: 'Race', value: item.requiredRace })
  if (item.setName) attributes.push({ label: 'Set', value: item.setName })
  if (item.source === 'wiki') {
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

function toLabeledWeaponStats(weaponStats: ItemWeaponStats): LabeledStat[] {
  const labeledStats: LabeledStat[] = []
  if (weaponStats.damage) labeledStats.push({ label: 'Damage', value: weaponStats.damage })
  if (weaponStats.critical) labeledStats.push({ label: 'Critical', value: weaponStats.critical })
  labeledStats.push({ label: 'Type', value: weaponStats.weaponType })
  if (weaponStats.proficiency)
    labeledStats.push({ label: 'Proficiency', value: weaponStats.proficiency })
  if (weaponStats.handedness)
    labeledStats.push({ label: 'Handedness', value: weaponStats.handedness })
  return labeledStats
}

function toLabeledArmorStats(armorStats: ItemArmorStats): LabeledStat[] {
  const labeledStats: LabeledStat[] = []
  labeledStats.push({ label: 'Type', value: armorStats.armorType })
  if (armorStats.armorBonus !== null)
    labeledStats.push({ label: 'Armor bonus', value: armorStats.armorBonus })
  if (armorStats.shieldBonus !== null)
    labeledStats.push({ label: 'Shield bonus', value: armorStats.shieldBonus })
  if (armorStats.maximumDexterityBonus !== null)
    labeledStats.push({ label: 'Max Dex bonus', value: armorStats.maximumDexterityBonus })
  if (armorStats.arcaneSpellFailurePercent !== null)
    labeledStats.push({
      label: 'Arcane spell failure',
      value: `${armorStats.arcaneSpellFailurePercent}%`,
    })
  if (armorStats.armorCheckPenalty !== null)
    labeledStats.push({ label: 'Armor check penalty', value: armorStats.armorCheckPenalty })
  if (armorStats.damageReduction !== null)
    labeledStats.push({ label: 'Damage reduction', value: armorStats.damageReduction })
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

  return (
    <article className="resources-detail-body">
      <DetailHeader
        name={item.name}
        attributes={headerAttributes}
        wikiUrl={item.wikiUrl}
        wikiPageName={item.name}
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
          <ul className="resources-flat-list">
            {item.clickies.map((c) => (
              <li key={c.name}>
                {c.name}
                {c.description && <p className="resources-bonus-description">{c.description}</p>}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
      {item.quests.length > 0 ? (
        <DetailSection heading="Drops from">
          <ul className="resources-quest-list">
            {item.quests.map((quest: LootQuest) => (
              <li key={quest.id} className="resources-quest-row">
                <span className="resources-quest-name">
                  {quest.name}
                  <WikiLinkIcon pageName={quest.name} />
                  {quest.isRaid && <DropTagChip kind="raid" />}
                  {quest.isRareLoot && <DropTagChip kind="rare" />}
                  {quest.chest && (
                    <span className="resources-quest-chest">{sentenceCased(quest.chest)}</span>
                  )}
                </span>
                <span className="resources-quest-meta">
                  {[
                    quest.patron,
                    quest.pack,
                    quest.level !== null ? `Level ${quest.level}` : null,
                    quest.lootType === 'reward' ? 'End reward' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : (
        item.dropLocation && (
          <DetailSection heading="Drops from">
            <p className="resources-detail-description">{item.dropLocation}</p>
          </DetailSection>
        )
      )}
    </article>
  )
}
