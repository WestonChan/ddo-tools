import type { FilterDefinition } from '../filters/filterModel'
import type { ItemListFilters, RaidQuest } from '../queries/items'

export function itemFilterDefinitions(
  equipmentSlots: string[],
  enchantmentNames: string[],
  packNames: string[],
  raidQuests: RaidQuest[],
  filters: ItemListFilters,
): FilterDefinition<ItemListFilters>[] {
  return [
    {
      key: 'ml',
      label: 'ML range',
      shortLabel: 'ML',
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
      key: 'enchantments',
      label: 'Enchantments',
      kind: 'multi',
      group: 'item',
      appliedGroupLabel:
        filters.enchantments.length > 1
          ? `Enchantments · ${filters.enchantmentMatch}`
          : 'Enchantments',
      searchPlaceholder: 'Bonus or enchantment…',
      options: enchantmentNames.map((name) => ({ value: name, label: name })),
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
