import type { JSX } from 'react'
import { WikiLinkIcon } from '../../../../components'
import { ResourceChip } from '../ResourceChip'
import { AugmentSlotList } from './AugmentSlotList'
import { EntityHeader } from './EntityHeader'
import { EnchantmentList } from './EnchantmentList'
import { DetailSection } from './DetailSection'
import { StatList, type StatListItem } from './StatList'
import type { KvItem } from './KeyValueGrid'
import { formatSigned } from './formatSigned'
import type {
  AugmentCandidate,
  ItemDetail as ItemDetailRow,
  ItemQuestRef,
  ItemWeaponStats,
  ItemArmorStats,
} from '../../queries/items'

function buildHeaderAttributes(
  detail: ItemDetailRow,
  candidates: Record<string, AugmentCandidate[]>,
): KvItem[] {
  const attrs: KvItem[] = []
  attrs.push({ label: 'Slot', value: detail.equipment_slot })
  attrs.push({ label: 'Type', value: detail.item_type ?? detail.item_category })
  if (detail.minimum_level !== null) attrs.push({ label: 'Min level', value: detail.minimum_level })
  if (detail.enhancement_bonus !== null) {
    attrs.push({ label: 'Enhancement', value: formatSigned(detail.enhancement_bonus) })
  }
  if (detail.material) attrs.push({ label: 'Material', value: detail.material })
  if (detail.race_required) attrs.push({ label: 'Race', value: detail.race_required })
  if (detail.set_name) attrs.push({ label: 'Set', value: detail.set_name })
  if (detail.augmentSlots.length > 0) {
    attrs.push({
      label: 'Augment slots',
      value: <AugmentSlotList slots={detail.augmentSlots} candidates={candidates} />,
    })
  }
  return attrs
}

function buildWeaponStats(stats: ItemWeaponStats): StatListItem[] {
  const items: StatListItem[] = []
  if (stats.damage) items.push({ label: 'Damage', value: stats.damage })
  if (stats.critical) items.push({ label: 'Critical', value: stats.critical })
  items.push({ label: 'Type', value: stats.weapon_type })
  if (stats.proficiency) items.push({ label: 'Proficiency', value: stats.proficiency })
  if (stats.handedness) items.push({ label: 'Handedness', value: stats.handedness })
  return items
}

function buildArmorStats(stats: ItemArmorStats): StatListItem[] {
  const items: StatListItem[] = []
  items.push({ label: 'Type', value: stats.armor_type })
  if (stats.armor_bonus !== null) items.push({ label: 'Armor bonus', value: stats.armor_bonus })
  if (stats.shield_bonus !== null) items.push({ label: 'Shield bonus', value: stats.shield_bonus })
  if (stats.max_dex_bonus !== null)
    items.push({ label: 'Max Dex bonus', value: stats.max_dex_bonus })
  if (stats.arcane_spell_failure !== null)
    items.push({ label: 'Arcane spell failure', value: `${stats.arcane_spell_failure}%` })
  if (stats.armor_check_penalty !== null)
    items.push({ label: 'Armor check penalty', value: stats.armor_check_penalty })
  if (stats.damage_reduction !== null)
    items.push({ label: 'Damage reduction', value: stats.damage_reduction })
  return items
}

export function ItemDetail({
  detail,
  candidates,
}: {
  detail: ItemDetailRow
  candidates: Record<string, AugmentCandidate[]>
}): JSX.Element {
  const headerAttrs = buildHeaderAttributes(detail, candidates)
  const weaponStats = detail.weaponStats ? buildWeaponStats(detail.weaponStats) : []
  const armorStats = detail.armorStats ? buildArmorStats(detail.armorStats) : []

  return (
    <article className="resources-detail-body">
      <EntityHeader
        name={detail.name}
        attributes={headerAttrs}
        wikiUrl={detail.wiki_url}
        wikiPageName={detail.name}
      />
      {detail.description && <p className="resources-detail-description">{detail.description}</p>}
      {weaponStats.length > 0 && (
        <DetailSection label="Weapon">
          <StatList items={weaponStats} />
        </DetailSection>
      )}
      {armorStats.length > 0 && (
        <DetailSection label="Armor">
          <StatList items={armorStats} />
        </DetailSection>
      )}
      <EnchantmentList bonuses={detail.bonuses} effects={detail.effects} />
      {detail.clickies.length > 0 && (
        <DetailSection label="Clickies">
          <ul className="resources-flat-list">
            {detail.clickies.map((c) => (
              <li key={c.name}>
                {c.name}
                {c.description && <p className="resources-bonus-description">{c.description}</p>}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
      {detail.quests.length > 0 ? (
        <DetailSection label="Drops from">
          <ul className="resources-quest-list">
            {detail.quests.map((q: ItemQuestRef) => (
              <li key={q.quest_id} className="resources-quest-row">
                <span className="resources-quest-name">
                  {q.name}
                  <WikiLinkIcon pageName={q.name} />
                  {q.is_raid && <ResourceChip kind="raid" />}
                  {q.is_rare && <ResourceChip kind="rare" />}
                </span>
                <span className="resources-quest-meta">
                  {[
                    q.patron,
                    q.pack,
                    q.level !== null ? `Level ${q.level}` : null,
                    q.loot_type === 'reward' ? 'End reward' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : (
        detail.drop_location && (
          <DetailSection label="Drops from">
            <p className="resources-detail-description">{detail.drop_location}</p>
          </DetailSection>
        )
      )}
    </article>
  )
}
