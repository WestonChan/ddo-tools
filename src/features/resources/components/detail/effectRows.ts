import type { SetDetail } from '../../queries/sets'
import type { Effect, Item, ResourceModifier } from '../../queries/items'
import { effectValue, itemEnhancementRow, type ItemEnhancementRow } from './structuredRows'

export interface EffectRow {
  itemName: string
  modifiers: ResourceModifier[]
  setId: number | null
  onOpenItem?: (id: number, name: string) => void
  hasBonusFilter: boolean
  key: string
  name: string
  type: string | null
  value: string
  effect: Effect | null
  enhancement: ItemEnhancementRow | null
  headingKind: 'set' | 'tier' | null
  bonusCount?: number
  isMatch: boolean
}

function matchesBonusFilter(effect: Effect, selectedBonuses: ReadonlySet<string>): boolean {
  if (selectedBonuses.has(effect.name.toLowerCase())) return true
  return effect.bonuses.some(
    (bonus) =>
      (bonus.group?.name !== undefined && selectedBonuses.has(bonus.group.name.toLowerCase())) ||
      selectedBonuses.has(bonus.statName.toLowerCase()) ||
      selectedBonuses.has(`${bonus.statName}:${bonus.bonusType}`.toLowerCase()),
  )
}

function toEffectRow(effect: Effect, selectedBonuses: ReadonlySet<string>, prefix = ''): EffectRow {
  return {
    key: `${prefix}effect-${effect.id}-${effect.sortOrder}`,
    itemName: '',
    modifiers: [],
    setId: null,
    hasBonusFilter: false,
    name: effect.name,
    type:
      effect.bonusType ??
      ([...new Set(effect.bonuses.map((bonus) => bonus.bonusType))].join(', ') || null),
    value: effectValue(effect) ?? '',
    effect,
    enhancement: null,
    headingKind: null,
    isMatch: matchesBonusFilter(effect, selectedBonuses),
  }
}

function setRows(setDetail: SetDetail, selectedBonuses: ReadonlySet<string>): EffectRow[] {
  const rows: EffectRow[] = [
    {
      key: `set-${setDetail.id}`,
      itemName: '',
      modifiers: [],
      setId: setDetail.id,
      hasBonusFilter: false,
      name: setDetail.name,
      type: null,
      value: '',
      effect: null,
      enhancement: null,
      headingKind: 'set',
      bonusCount: setDetail.tiers.reduce((count, tier) => count + tier.effects.length, 0),
      isMatch: false,
    },
  ]
  for (const tier of setDetail.tiers) {
    rows.push({
      key: `tier-${tier.equippedCount}`,
      itemName: '',
      modifiers: [],
      setId: setDetail.id,
      hasBonusFilter: false,
      name: `${tier.equippedCount} pieces`,
      type: null,
      value: '',
      effect: null,
      enhancement: null,
      headingKind: 'tier',
      isMatch: false,
    })
    rows.push(
      ...tier.effects.map((effect) =>
        toEffectRow(effect, selectedBonuses, `tier-${tier.equippedCount}-`),
      ),
    )
  }
  return rows
}

export function itemEffectRows({
  item,
  effects,
  matchingBonuses = [],
  itemName = '',
  modifiers = [],
  onOpenItem,
}: {
  item?: Item
  effects: Effect[]
  matchingBonuses?: string[]
  itemName?: string
  modifiers?: ResourceModifier[]
  onOpenItem?: (id: number, name: string) => void
}): EffectRow[] {
  const selectedBonuses = new Set(matchingBonuses.map((name) => name.toLowerCase()))
  const enhancement = item ? itemEnhancementRow(item) : null
  const enhancementRows: EffectRow[] =
    enhancement && item
      ? [
          {
            key: `item-enhancement-${item.id}`,
            name: enhancement.name,
            type: enhancement.type,
            value: enhancement.value,
            effect: null,
            enhancement,
            headingKind: null,
            isMatch: false,
            itemName,
            modifiers,
            setId: null,
            onOpenItem,
            hasBonusFilter: matchingBonuses.length > 0,
          },
        ]
      : []
  return [
    ...enhancementRows,
    ...effects.map((effect) => ({
      ...toEffectRow(effect, selectedBonuses),
      itemName,
      modifiers,
      setId: null,
      onOpenItem,
      hasBonusFilter: matchingBonuses.length > 0,
    })),
  ]
}

export function setEffectRows(
  setDetail: SetDetail,
  matchingBonuses: string[] = [],
  onOpenItem?: (id: number, name: string) => void,
): EffectRow[] {
  const selectedBonuses = new Set(matchingBonuses.map((name) => name.toLowerCase()))
  return setRows(setDetail, selectedBonuses).map((row) => ({
    ...row,
    itemName: setDetail.name,
    modifiers: [],
    setId: setDetail.id,
    onOpenItem,
    hasBonusFilter: matchingBonuses.length > 0,
  }))
}
