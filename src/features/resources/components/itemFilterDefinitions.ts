import type { FilterDefinition } from '../filters/filterModel'
import type { ApiEffectVocabularyRow } from '../../../lib/api'
import { statBonusFilterValue } from '../../../lib/api'
import type { ItemListFilters, RaidQuest } from '../queries/items'
import { effectKindLabel } from './effectKindLabel'

export function itemFilterDefinitions(
  equipmentSlots: string[],
  effectVocabulary: ApiEffectVocabularyRow[],
  allEffectVocabulary: ApiEffectVocabularyRow[],
  effectVocabularyTotal: number,
  setNames: string[],
  setVocabularyTotal: number,
  packNames: string[],
  raidQuests: RaidQuest[],
  filters: ItemListFilters,
): FilterDefinition<ItemListFilters>[] {
  return [
    {
      key: 'ml',
      label: 'ML range',
      shortLabel: 'ML',
      accessibleName: 'Minimum level',
      kind: 'range',
      group: 'item',
      range: {
        minLabel: 'Min ML',
        maxLabel: 'Max ML',
        minimum: 1,
        maximum: 36,
        minPlaceholder: '1',
        maxPlaceholder: '36',
        hint: 'Either bound can be blank. Applies on Enter or when you leave the field.',
      },
    },
    {
      key: 'slot',
      label: 'Gear slot',
      kind: 'multi',
      group: 'item',
      searchPlaceholder: 'Find a slot…',
      options: equipmentSlots.map((slot) => ({ value: slot, label: slot })),
    },
    {
      key: 'bonuses',
      label: 'Bonuses',
      kind: 'multi',
      group: 'item',
      appliedGroupLabel: filters.bonuses.length > 1 ? `Bonuses · ${filters.bonusMatch}` : 'Bonuses',
      searchPlaceholder: 'Stat, group or enchantment…',
      isServerSearched: true,
      shouldPreserveOptionOrder: true,
      optionCount: effectVocabularyTotal,
      hoverKind: 'bonus',
      selectedOptionLabels: new Map(
        allEffectVocabulary.flatMap((row): Array<[string, string]> => [
          [row.name, row.name],
          ...row.bonus_types.map((bonusType): [string, string] => [
            statBonusFilterValue(row.name, bonusType.name),
            `${row.name} · ${bonusType.name}`,
          ]),
        ]),
      ),
      options: effectVocabulary.map((row) => {
        const selectedTypes = row.bonus_types.filter((bonusType) =>
          filters.bonuses.includes(statBonusFilterValue(row.name, bonusType.name)),
        )
        const typeLabel =
          selectedTypes.length === 0
            ? 'Any type'
            : selectedTypes.length === 1
              ? selectedTypes[0].name
              : `${selectedTypes.length} types`
        return {
          key: row.detail_path,
          detailPath: row.detail_path,
          hoverLabel: effectKindLabel(row.kind),
          value: row.name,
          label: row.name,
          caption: row.kind === 'stat' ? `Stat · ${typeLabel}` : effectKindLabel(row.kind),
          children:
            row.kind === 'stat'
              ? row.bonus_types.map((bonusType) => ({
                  value: statBonusFilterValue(row.name, bonusType.name),
                  label: `${row.name} · ${bonusType.name}`,
                  caption: `${bonusType.item_count}`,
                  detailPath: row.detail_path,
                  hoverLabel: 'Stat',
                }))
              : undefined,
        }
      }),
    },
    {
      key: 'set',
      label: 'Set',
      kind: 'multi',
      group: 'item',
      appliedGroupLabel: filters.set.length > 1 ? `Set · ${filters.setMatch}` : 'Set',
      searchPlaceholder: 'Find a set…',
      isServerSearched: true,
      shouldPreserveOptionOrder: true,
      optionCount: setVocabularyTotal,
      options: setNames.map((name) => ({ value: name, label: name })),
    },
    {
      key: 'pack',
      label: 'Pack',
      kind: 'multi',
      group: 'source',
      searchPlaceholder: 'Find a pack…',
      options: packNames.map((pack) => ({ value: pack, label: pack })),
    },
    {
      key: 'raid',
      label: 'Raid',
      kind: 'multi',
      group: 'source',
      searchPlaceholder: 'Find a raid…',
      options: raidQuests.map((quest) => ({
        value: String(quest.id),
        label: quest.name,
        caption: quest.pack ?? undefined,
      })),
    },
    {
      key: 'isRareOnly',
      label: 'Rare only',
      kind: 'toggle',
      group: 'loot',
      appliedGroupLabel: 'Show',
    },
    {
      key: 'isRaidOnly',
      label: 'Raid only',
      kind: 'toggle',
      group: 'loot',
      appliedGroupLabel: 'Show',
    },
  ]
}
