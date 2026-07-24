import type { JSX } from 'react'
import { DetailSection } from './DetailSection'
import type { ItemBonus, ItemEffect } from '../../queries/items'

interface EnchantmentListProps {
  bonuses: ItemBonus[]
  effects: ItemEffect[]
}

// Display row used by the merged Enchantments section. Bonuses and effects
// are separate tables in the schema (different stacking semantics, different
// shapes) but are visually one list to a reader inspecting an item.
//
// Layout note: rows render in three grid columns — `[tag] [name + WikiLinkIcon] [value]`
// — so type chips and values column-align across rows of varying name length.
// For stat-bonus rows, `name` is the bare stat name (e.g. "Charisma") and
// `value` carries the magnitude separately ("+5"). For non-stat bonuses and
// effects, `name` carries the full label and `value` is null.
interface EnchantmentLine {
  key: string
  /** Tag chip in the first column — bonus_type for bonuses, modifier for effects. */
  tag: string | null
  /** Display label for the middle column. Bare stat name for stat bonuses;
   *  full label for non-stat bonuses and effects. */
  name: string
  /** Right-column value text for stat bonuses (e.g. "+5"). Null when value
   *  is folded into `name` (effects, non-stat bonuses). */
  value: string | null
  /** Muted sub-line below the head. Bonuses-only; null for effects. */
  description: string | null
  /** Underlying stat name — when set, the row renders a `WikiLinkIcon` next
   *  to the name pointing at `https://ddowiki.com/page/<stat>`. Null for
   *  effects and non-stat bonuses (e.g. "On hit: -1 AC to target") — those
   *  rows render plain text. */
  statName: string | null
}

// Frontend workaround for a scraper data-quality gap — see Phase 4c in
// docs/roadmap.md. Some bonus descriptions carry raw MediaWiki template
// syntax (`{{Elemental Resistance|Fire|30}}`) the scraper didn't expand.
// Strip the template invocations at render time so the user sees clean
// text; if nothing meaningful is left, the description is dropped. Once
// the ETL expands templates, this function and its caller go away.
function cleanDescription(text: string | null): string | null {
  if (!text) return null
  const stripped = text.replace(/\{\{[^{}]*\}\}/g, '').trim()
  return stripped.length > 0 ? stripped : null
}

function bonusToLine(b: ItemBonus): EnchantmentLine {
  const description = cleanDescription(b.description)
  // Stat bonuses split into separate name + value columns so values column-
  // align across rows. Bonuses without a backing stat (e.g. "On hit: -1 AC
  // to target") keep the full text in the name column with no separate value.
  const isStatBonus = b.stat_name !== null
  const name = isStatBonus ? (b.stat_name ?? b.name) : b.name
  const value = isStatBonus && b.value !== null ? `+${b.value}` : null
  return {
    key: `b-${b.bonus_id}-${b.sort_order}`,
    tag: b.bonus_type,
    name,
    value,
    description: description && description !== b.name ? description : null,
    statName: b.stat_name,
  }
}

function effectToLine(e: ItemEffect): EnchantmentLine {
  // Effects sometimes carry a numeric `value` (e.g., Bane +4d6); fold it into
  // the visible name so the user sees the full magnitude without us inventing
  // a new column shape just for effects.
  const name = e.value !== null ? `${e.name} +${e.value}` : e.name
  return {
    key: `e-${e.effect_id}-${e.sort_order}`,
    tag: e.modifier,
    name,
    value: null,
    description: null,
    statName: null,
  }
}

/**
 * Renders the merged enchantments section: bonuses first, then effects, each
 * row showing name + type chip + (optional) description sub-line. Returns
 * `null` when neither list has entries so the caller can compose this in
 * without an empty-section wrapper.
 *
 * Lives in its own component so the upcoming wiki-link + tooltip wiring
 * (best-effort `https://ddowiki.com/page/<name>` anchors, hover tooltip with
 * stacking semantics) has a self-contained surface to grow into and to test.
 */
export function EnchantmentList({ bonuses, effects }: EnchantmentListProps): JSX.Element | null {
  if (bonuses.length === 0 && effects.length === 0) return null

  const lines: EnchantmentLine[] = [
    ...bonuses.map(bonusToLine),
    ...effects.map(effectToLine),
  ]

  return (
    <DetailSection label="Enchantments">
      <ul className="resources-bonus-list">
        {lines.map((line) => (
          <li key={line.key} className="resources-bonus-row">
            <div className="resources-bonus-head">
              <span className="resources-bonus-type">{line.tag ?? ''}</span>
              <span className="resources-bonus-name">{line.name}</span>
              <span className="resources-bonus-value">{line.value ?? ''}</span>
            </div>
            {line.description && (
              <p className="resources-bonus-description">{line.description}</p>
            )}
          </li>
        ))}
      </ul>
    </DetailSection>
  )
}
