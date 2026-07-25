import type { JSX } from 'react'
import { TooltipWrapper, WikiLinkIcon } from '../../../../components'
import { EntityHeader } from './EntityHeader'
import { EnchantmentList } from './EnchantmentList'
import { formatSigned } from './formatSigned'
import { DetailSection } from './DetailSection'
import { StatList, type StatListItem } from './StatList'
import type { KvItem } from './KeyValueGrid'
import type {
  ItemDetail as ItemDetailRow,
  ItemQuestRef,
  ItemSpellLink,
  ItemAugmentSlot,
  ItemUpgrade,
  ItemWeaponStats,
  ItemArmorStats,
} from '../../queries/items'

function buildHeaderAttributes(detail: ItemDetailRow): KvItem[] {
  const attrs: KvItem[] = []
  if (detail.equipment_slot) attrs.push({ label: 'Slot', value: detail.equipment_slot })
  if (detail.item_category) attrs.push({ label: 'Type', value: detail.item_category })
  if (detail.minimum_level !== null) attrs.push({ label: 'Min level', value: detail.minimum_level })
  if (detail.enhancement_bonus !== null)
    attrs.push({ label: 'Enhancement', value: formatSigned(detail.enhancement_bonus) })
  if (detail.material) attrs.push({ label: 'Material', value: detail.material })
  if (detail.binding) attrs.push({ label: 'Binding', value: detail.binding })
  if (detail.augmentSlots.length > 0) {
    attrs.push({
      label: 'Augment slots',
      value: (
        <ul className="resources-augment-list">
          {detail.augmentSlots.map((s: ItemAugmentSlot) => (
            <li
              key={s.sort_order}
              className="resources-augment-slot"
              data-color={s.slot_type.toLowerCase()}
            >
              <TooltipWrapper text={`${s.slot_type} augment slot`}>
                <span
                  className="resources-augment-gem"
                  role="img"
                  aria-label={`${s.slot_type} augment slot`}
                />
              </TooltipWrapper>
            </li>
          ))}
        </ul>
      ),
    })
  }
  return attrs
}

function buildWeaponStats(stats: ItemWeaponStats): StatListItem[] {
  const items: StatListItem[] = []
  if (stats.damage) items.push({ label: 'Damage', value: stats.damage })
  if (stats.critical) items.push({ label: 'Critical', value: stats.critical })
  if (stats.weapon_type) items.push({ label: 'Type', value: stats.weapon_type })
  if (stats.proficiency) items.push({ label: 'Proficiency', value: stats.proficiency })
  if (stats.handedness) items.push({ label: 'Handedness', value: stats.handedness })
  return items
}

function buildArmorStats(stats: ItemArmorStats): StatListItem[] {
  const items: StatListItem[] = []
  if (stats.armor_bonus !== null) items.push({ label: 'Armor bonus', value: stats.armor_bonus })
  if (stats.max_dex_bonus !== null) items.push({ label: 'Max Dex bonus', value: stats.max_dex_bonus })
  return items
}

export function ItemDetail({ detail }: { detail: ItemDetailRow }): JSX.Element {
  const headerAttrs = buildHeaderAttributes(detail)
  const weaponStats = detail.weaponStats ? buildWeaponStats(detail.weaponStats) : []
  const armorStats = detail.armorStats ? buildArmorStats(detail.armorStats) : []

  return (
    <article className="resources-detail-body">
      <EntityHeader
        name={detail.name}
        rarity={detail.rarity}
        attributes={headerAttrs}
        wikiUrl={detail.wiki_url}
        wikiPageName={detail.name}
      />
      {detail.description && (
        <p className="resources-detail-description">{detail.description}</p>
      )}
      {detail.tooltip && detail.tooltip !== detail.description && (
        <p className="resources-detail-tooltip">{detail.tooltip}</p>
      )}
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
      {detail.spellLinks.length > 0 && (
        <DetailSection label="Spells">
          <ul className="resources-flat-list">
            {detail.spellLinks.map((s: ItemSpellLink) => (
              <li key={s.spell_id}>
                {s.name}
                {s.charges !== null && ` — ${s.charges} charges`}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
      {detail.quests.length > 0 && (
        <DetailSection label="Drops from">
          <ul className="resources-quest-list">
            {detail.quests.map((q: ItemQuestRef) => (
              <li key={q.quest_id} className="resources-quest-row">
                <span className="resources-quest-name">
                  {q.name}
                  {/* No quests.wiki_url column yet (roadmap Phase 4c) — the
                      URL derives from the quest name. Breaks on wiki pages
                      with disambiguation suffixes; acceptable until the
                      column ships and this switches to href. */}
                  <WikiLinkIcon pageName={q.name} />
                </span>
                <span className="resources-quest-meta">
                  {[
                    q.patron,
                    q.pack,
                    q.zone,
                    q.npc,
                    q.level !== null ? `Level ${q.level}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
      {detail.upgrades.length > 0 && (
        <DetailSection label="Upgrades">
          <ul className="resources-flat-list">
            {detail.upgrades.map((u: ItemUpgrade) => (
              <li key={u.upgrade_tier}>Tier {u.upgrade_tier}</li>
            ))}
          </ul>
        </DetailSection>
      )}
    </article>
  )
}
