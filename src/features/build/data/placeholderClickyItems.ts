import type { PlaceholderAbility } from './placeholderAbilities'

export interface PlaceholderClickyItem {
  id: string
  name: string
  shortCode: string
  slot: string
  minimumLevel: number
  clickyName: string
  uses: string
  isOwned: boolean
}

export const ITEMS_WITH_ACTIVE_ABILITY_COUNT = 1206

export const PLACEHOLDER_CLICKY_ITEMS: readonly PlaceholderClickyItem[] = [
  {
    id: 'mists',
    name: 'Legendary Cloak of the Mists',
    shortCode: 'MST',
    slot: 'Cloak',
    minimumLevel: 29,
    clickyName: 'Displacement',
    uses: '3/rest',
    isOwned: true,
  },
  {
    id: 'propulsion',
    name: 'Legendary Boots of Propulsion',
    shortCode: 'LBP',
    slot: 'Boots',
    minimumLevel: 29,
    clickyName: 'Haste',
    uses: '5/rest',
    isOwned: true,
  },
  {
    id: 'voice',
    name: 'Legendary Voice of the Master',
    shortCode: 'LVM',
    slot: 'Trinket',
    minimumLevel: 29,
    clickyName: 'Greater Teleport',
    uses: '1/rest',
    isOwned: true,
  },
  {
    id: 'jibbers',
    name: 'Jibbers Blade',
    shortCode: 'JIB',
    slot: 'Weapon',
    minimumLevel: 20,
    clickyName: 'Self-resurrection',
    uses: '1/rest',
    isOwned: false,
  },
  {
    id: 'night',
    name: 'Cloak of Night',
    shortCode: 'NGT',
    slot: 'Cloak',
    minimumLevel: 25,
    clickyName: 'Deathward',
    uses: '3/rest',
    isOwned: true,
  },
  {
    id: 'abbot',
    name: 'Shroud of the Abbot',
    shortCode: 'ABT',
    slot: 'Cloak',
    minimumLevel: 20,
    clickyName: 'Blur',
    uses: '3/rest',
    isOwned: false,
  },
  {
    id: 'bauble',
    name: 'Bauble',
    shortCode: 'BAU',
    slot: 'Trinket',
    minimumLevel: 4,
    clickyName: 'Recharge spell points',
    uses: '1/rest',
    isOwned: true,
  },
]

export function toAddedClickyAbility(item: PlaceholderClickyItem): PlaceholderAbility {
  return {
    id: `clicky-${item.id}`,
    name: item.name,
    shortCode: item.shortCode,
    damageType: 'none',
    kind: `${item.slot} · added — swap to use`,
    cooldown: item.uses,
    save: '—',
    damage: item.clickyName,
    cost: 'free',
    isEquipped: false,
  }
}

export function itemIdsWithItemAdded(itemIds: readonly string[], itemId: string): string[] {
  return itemIds.includes(itemId) ? [...itemIds] : [...itemIds, itemId]
}

export function itemIdsWithoutItem(itemIds: readonly string[], itemId: string): string[] {
  return itemIds.filter((listedItemId) => listedItemId !== itemId)
}
