import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ApiAugment, ApiItemDetail, ApiItemRow } from '../../../lib/api'
import {
  fetchAugmentLootQuests,
  fetchAugmentsFittingSlot,
  fetchItemIdsWithStat,
  fetchItemSummaries,
  isCraftingSlotFamily,
  canListFittingAugments,
  toAugmentSummary,
  toItem,
  toItemSummary,
} from './items'

afterEach(() => {
  vi.restoreAllMocks()
})

function createApiItemRow(overrides: Partial<ApiItemRow> = {}): ApiItemRow {
  return {
    id: 1,
    name: 'Bloodstone',
    slot: 'Trinket',
    category: 'Jewelry',
    item_type: null,
    minimum_level: 12,
    enhancement_bonus: null,
    icon: 'Trinket_1',
    pack: 'Vault of Night',
    is_raid: true,
    is_rare: false,
    is_legacy: false,
    ...overrides,
  }
}

const API_ITEM_DETAIL: ApiItemDetail = {
  id: 7,
  name: 'Sireth, Spear of the Sky',
  slot: 'Main Hand',
  category: 'Weapon',
  item_type: 'Quarterstaff',
  minimum_level: 23,
  enhancement_bonus: 7,
  material: 'Steel',
  race_required: null,
  icon: 'Quarterstaff_6a',
  description: 'A spear.',
  drop_location: 'Caught in the Web, End Chest',
  set_name: null,
  accepts_sentience: true,
  is_minor_artifact: false,
  wiki_url: 'https://ddowiki.com/page/Item:Sireth,_Spear_of_the_Sky',
  is_legacy: false,
  weapon: {
    weapon_type: 'Quarterstaff',
    proficiency: 'Simple',
    handedness: 'Two-handed',
    damage: '3.6[1d10] + 7 Good, Magic, Pierce, Slash',
    critical: '16-20 / x2',
    base_dice_count: 1,
    base_dice_sides: 10,
    base_dice_bonus: null,
    damage_multiplier: 3.6,
    critical_threat_range: 5,
    critical_multiplier: 2,
    attack_modifier: 'Strength',
    damage_modifier: 'Strength',
    dr_bypass: ['Good', 'Magic', 'Pierce', 'Slash'],
  },
  armor: null,
  bonuses: [
    {
      id: 3,
      name: 'Fire Spell Power +54',
      description: null,
      stat: 'Fire Spell Power',
      stat_category: 'magical',
      bonus_type: 'Enhancement',
      value: 54,
      value2: null,
    },
  ],
  effects: [{ id: 9, name: 'Supreme Good', description: 'Smites.', value: null, target: 'All' }],
  augment_slots: [
    {
      sort_order: 0,
      slot_type_id: 4,
      label: 'crafting: attuned to heroism 1',
      family: 'crafting',
      variant: 'attuned to heroism 1',
      qualifier: null,
      options: [{ name: 'Planar Conflux', description: null, min_level: 23 }],
    },
    {
      sort_order: 1,
      slot_type_id: 1,
      label: 'red',
      family: 'standard',
      variant: 'red',
      qualifier: null,
      options: [],
    },
  ],
  clickies: [
    { name: 'Acid Shot', clickie_id: 2, spell_id: null, description: 'Shoots acid.', icon: null },
  ],
  set: { id: 5, name: 'Eminence of Winter', icon: null },
  quests: [
    {
      id: 11,
      name: 'Caught in the Web',
      level: 20,
      epic_level: null,
      is_raid: true,
      is_rare: true,
      pack: 'Web of Chaos',
      patron: 'The Twelve',
      loot_type: 'raid',
      is_free_to_play: false,
      difficulties: ['normal', 'hard', 'elite'],
      chest: 'raid warded chest',
    },
  ],
  quest_chains: [
    {
      id: 3,
      name: 'The Lost Seekers',
      is_rare: true,
      wiki_url: 'https://ddowiki.com/page/The_Lost_Seekers',
    },
  ],
  sagas: [
    {
      id: 1,
      name: 'Masterminds of Sharn',
      tier: 'epic',
      is_rare: false,
      wiki_url: 'https://ddowiki.com/page/Masterminds_of_Sharn_(saga)',
    },
    { id: 1, name: 'Masterminds of Sharn', tier: 'legendary', is_rare: true, wiki_url: null },
  ],
  adventure_packs: [],
  crafting_systems: [],
  challenge_packs: [],
  vendors: [],
  events: [],
  starter_rewards: [],
  sources: [],
}

describe('mappers', () => {
  it('toItemSummary renames the API columns the picker reads', () => {
    expect(toItemSummary(createApiItemRow())).toEqual({
      id: 1,
      name: 'Bloodstone',
      equipmentSlot: 'Trinket',
      category: 'Jewelry',
      minimumLevel: 12,
      pack: 'Vault of Night',
      isRaidLoot: true,
      isRareLoot: false,
      isLegacy: false,
    })
  })

  it('toItemSummary and toItem carry the legacy flag', () => {
    expect(toItemSummary(createApiItemRow({ is_legacy: true })).isLegacy).toBe(true)
    expect(toItem({ ...API_ITEM_DETAIL, is_legacy: true }).isLegacy).toBe(true)
    expect(toItem(API_ITEM_DETAIL).isLegacy).toBe(false)
  })

  it('toItemSummary carries the rare-loot flag', () => {
    expect(toItemSummary(createApiItemRow({ is_rare: true })).isRareLoot).toBe(true)
  })

  it('toItem nests every satellite the drawer renders', () => {
    const item = toItem(API_ITEM_DETAIL)
    expect(item.equipmentSlot).toBe('Main Hand')
    expect(item.enhancementBonus).toBe(7)
    expect(item.setName).toBe('Eminence of Winter')
    expect(item.weaponStats?.damageReductionBypasses).toHaveLength(4)
    expect(item.armorStats).toBeNull()
    expect(item.bonuses[0]).toEqual({
      id: 3,
      name: 'Fire Spell Power +54',
      description: null,
      bonusType: 'Enhancement',
      statName: 'Fire Spell Power',
      value: 54,
      sortOrder: 0,
    })
    expect(item.effects[0]).toEqual({
      id: 9,
      name: 'Supreme Good',
      description: 'Smites.',
      target: 'All',
      value: null,
      sortOrder: 0,
    })
    expect(item.augmentSlots[0].options[0].name).toBe('Planar Conflux')
    expect(item.clickies).toEqual([{ name: 'Acid Shot', description: 'Shoots acid.' }])
    expect(item.quests[0]).toEqual({
      id: 11,
      name: 'Caught in the Web',
      level: 20,
      pack: 'Web of Chaos',
      patron: 'The Twelve',
      isEndReward: false,
      isRaid: true,
      isRareLoot: true,
      isFreeToPlay: false,
      chests: ['raid warded chest'],
    })
  })

  it('toItem carries the quest chains and sagas whose end reward offers the item', () => {
    const item = toItem(API_ITEM_DETAIL)
    expect(item.questChains).toEqual([
      {
        id: 3,
        name: 'The Lost Seekers',
        isRareLoot: true,
        wikiUrl: 'https://ddowiki.com/page/The_Lost_Seekers',
      },
    ])
    expect(item.sagas).toEqual([
      {
        id: 1,
        name: 'Masterminds of Sharn',
        tier: 'epic',
        isRareLoot: false,
        wikiUrl: 'https://ddowiki.com/page/Masterminds_of_Sharn_(saga)',
      },
      { id: 1, name: 'Masterminds of Sharn', tier: 'legendary', isRareLoot: true, wikiUrl: null },
    ])
  })

  it('toItem carries the adventure packs that drop the item anywhere in the pack', () => {
    const item = toItem({
      ...API_ITEM_DETAIL,
      adventure_packs: [
        {
          id: 25,
          name: 'The Isle of Dread',
          loot_type: 'chest',
          chest: 'any legendary chest',
          is_rare: true,
          wiki_url: 'https://ddowiki.com/page/The_Isle_of_Dread',
        },
        {
          id: 40,
          name: 'Magic of Myth Drannor',
          loot_type: 'chest',
          chest: null,
          is_rare: false,
          wiki_url: null,
        },
      ],
    })
    expect(item.adventurePackDrops).toEqual([
      {
        kind: 'adventurePack',
        key: 'adventurePack-25',
        name: 'The Isle of Dread',
        vendorLocation: null,
        cost: null,
        chest: 'any legendary chest',
        characterLevel: null,
        isRareLoot: true,
        wikiUrl: 'https://ddowiki.com/page/The_Isle_of_Dread',
      },
      {
        kind: 'adventurePack',
        key: 'adventurePack-40',
        name: 'Magic of Myth Drannor',
        vendorLocation: null,
        cost: null,
        chest: null,
        characterLevel: null,
        isRareLoot: false,
        wikiUrl: null,
      },
    ])
    expect(item.sourcesBeyondQuests).toEqual([])
  })

  it('toItem lists crafting systems, challenge packs, vendors, events and starter gear as sources beyond quests', () => {
    const item = toItem({
      ...API_ITEM_DETAIL,
      crafting_systems: [
        {
          id: 32,
          name: 'Thunder-Forged',
          is_rare: false,
          wiki_url: 'https://ddowiki.com/page/Thunder-Forged',
        },
      ],
      challenge_packs: [
        {
          id: 62,
          name: 'Secrets of the Artificers',
          is_rare: true,
          wiki_url: 'https://ddowiki.com/page/Secrets_of_the_Artificers',
        },
      ],
      vendors: [
        {
          id: 1,
          name: 'Morten Edgewright',
          location: 'The Harbor',
          cost: '50 Tokens',
          is_rare: false,
          wiki_url: null,
        },
      ],
      events: [
        {
          id: 4,
          name: 'The Night Revels',
          is_rare: false,
          wiki_url: 'https://ddowiki.com/page/The_Night_Revels',
        },
      ],
      starter_rewards: [{ character_level: 15 }],
    })
    expect(item.sourcesBeyondQuests).toEqual([
      {
        kind: 'craftingSystem',
        key: 'craftingSystem-32',
        name: 'Thunder-Forged',
        vendorLocation: null,
        cost: null,
        chest: null,
        characterLevel: null,
        isRareLoot: false,
        wikiUrl: 'https://ddowiki.com/page/Thunder-Forged',
      },
      {
        kind: 'challengePack',
        key: 'challengePack-62',
        name: 'Secrets of the Artificers',
        vendorLocation: null,
        cost: null,
        chest: null,
        characterLevel: null,
        isRareLoot: true,
        wikiUrl: 'https://ddowiki.com/page/Secrets_of_the_Artificers',
      },
      {
        kind: 'vendor',
        key: 'vendor-1',
        name: 'Morten Edgewright',
        vendorLocation: 'The Harbor',
        cost: '50 Tokens',
        chest: null,
        characterLevel: null,
        isRareLoot: false,
        wikiUrl: null,
      },
      {
        kind: 'event',
        key: 'event-4',
        name: 'The Night Revels',
        vendorLocation: null,
        cost: null,
        chest: null,
        characterLevel: null,
        isRareLoot: false,
        wikiUrl: 'https://ddowiki.com/page/The_Night_Revels',
      },
      {
        kind: 'starter',
        key: 'starter-15',
        name: 'Starter gear at level 15',
        vendorLocation: null,
        cost: null,
        chest: null,
        characterLevel: 15,
        isRareLoot: false,
        wikiUrl: null,
      },
    ])
  })

  it('toItem gives an item with only quest sources no sources beyond quests', () => {
    expect(toItem(API_ITEM_DETAIL).sourcesBeyondQuests).toEqual([])
  })

  it('toItem groups the loot rows of one quest into one quest with every source', () => {
    const chestDrop = {
      ...API_ITEM_DETAIL.quests[0],
      is_raid: false,
      is_rare: false,
      loot_type: 'chest',
      chest: 'end chest',
    }
    const endReward = { ...chestDrop, loot_type: 'reward', is_rare: true, chest: null }
    const item = toItem({ ...API_ITEM_DETAIL, quests: [chestDrop, endReward] })
    expect(item.quests).toHaveLength(1)
    expect(item.quests[0]).toMatchObject({
      id: 11,
      chests: ['end chest'],
      isEndReward: true,
      isRareLoot: true,
      isRaid: false,
    })
  })

  it('toItem marks a grouped quest raid when any of its loot rows is a raid drop', () => {
    const raidDrop = { ...API_ITEM_DETAIL.quests[0], is_rare: false }
    const endReward = { ...raidDrop, is_raid: false, loot_type: 'reward', chest: null }
    expect(toItem({ ...API_ITEM_DETAIL, quests: [endReward, raidDrop] }).quests[0]).toMatchObject({
      isRaid: true,
      isRareLoot: false,
      isEndReward: true,
      chests: ['raid warded chest'],
    })
  })

  it('toAugmentSummary flattens bonus labels', () => {
    const a: ApiAugment = {
      id: 2,
      name: 'Silverscale',
      family: 'DinosaurBone',
      description: null,
      min_level: 31,
      icon: null,
      slots: ['isle of dread: scale (armor)'],
      bonuses: [
        {
          id: 1,
          name: 'Healing Amplification +56',
          description: null,
          stat: 'Healing Amplification',
          stat_category: 'other',
          bonus_type: 'Competence',
          value: 56,
          value2: null,
        },
      ],
      crafting: [],
    }
    expect(toAugmentSummary(a)).toEqual({
      id: 2,
      name: 'Silverscale',
      minimumLevel: 31,
      bonusNames: ['Healing Amplification +56'],
      recipes: [],
    })
  })

  it('toAugmentSummary keeps each crafting recipe with its system, tier and ingredient quantities', () => {
    const a: ApiAugment = {
      id: 3,
      name: 'Melancholic Acid Spell Critical Damage (Legendary)',
      family: 'Lamordia_Legendary',
      description: null,
      min_level: 31,
      icon: null,
      slots: ['lamordia: melancholic (accessory)'],
      bonuses: [],
      crafting: [
        {
          system: 'Viktranium Experiment Crafting',
          tier: 'legendary',
          option: 'Melancholic Acid Spell Crit Damage',
          cost: [
            { ingredient: 'Legendary Bleak Alternator', tier: 'legendary', quantity: 25 },
            { ingredient: 'Legendary Bleak Conductor', tier: 'legendary', quantity: 25 },
          ],
        },
      ],
    }
    expect(toAugmentSummary(a).recipes).toEqual([
      {
        system: 'Viktranium Experiment Crafting',
        tier: 'legendary',
        ingredientCosts: [
          { ingredient: 'Legendary Bleak Alternator', quantity: 25 },
          { ingredient: 'Legendary Bleak Conductor', quantity: 25 },
        ],
      },
    ])
  })

  it('slot rules: families and Sun/Moon get candidate lists', () => {
    expect(isCraftingSlotFamily('standard')).toBe(false)
    expect(isCraftingSlotFamily('lamordia')).toBe(true)
    expect(canListFittingAugments('standard', 'sun')).toBe(true)
    expect(canListFittingAugments('standard', 'red')).toBe(false)
    expect(canListFittingAugments('crafting', 'crafting: tier 2')).toBe(true)
  })
})

describe('fetchers', () => {
  function mockFetchResponse(responseBody: unknown): void {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 }),
    )
  }

  it('fetchItemSummaries asks for the whole list and sorts by level desc, slot, name; unleveled last', async () => {
    mockFetchResponse({
      total: 4,
      limit: 10000,
      offset: 0,
      items: [
        createApiItemRow({ id: 1, name: 'b', minimum_level: 8, slot: 'Ring' }),
        createApiItemRow({ id: 2, name: 'a', minimum_level: null }),
        createApiItemRow({ id: 3, name: 'c', minimum_level: 29, slot: 'Back' }),
        createApiItemRow({ id: 4, name: 'A', minimum_level: 8, slot: 'Ring' }),
      ],
    })
    const rows = await fetchItemSummaries()
    expect(rows.map((r) => r.id)).toEqual([3, 4, 1, 2])
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/v1/items?limit=10000')
  })

  it('fetchItemIdsWithStat returns a set of ids from the filtered list', async () => {
    mockFetchResponse({
      total: 2,
      limit: 10000,
      offset: 0,
      items: [createApiItemRow({ id: 5 }), createApiItemRow({ id: 6 })],
    })
    await expect(fetchItemIdsWithStat('Strength')).resolves.toEqual(new Set([5, 6]))
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('enchantment=Strength')
  })

  it('fetchAugmentsFittingSlot orders by level then name', async () => {
    const createApiAugment = (id: number, name: string, min_level: number | null): ApiAugment => ({
      id,
      name,
      family: 'Ruby',
      description: null,
      min_level,
      icon: null,
      slots: ['red'],
      bonuses: [],
      crafting: [],
    })
    mockFetchResponse({
      total: 3,
      limit: 10000,
      offset: 0,
      augments: [
        createApiAugment(1, 'Zed', 4),
        createApiAugment(2, 'Abe', null),
        createApiAugment(3, 'Bob', 4),
      ],
    })
    const fittingAugments = await fetchAugmentsFittingSlot('red')
    expect(fittingAugments.map((a) => a.name)).toEqual(['Bob', 'Zed', 'Abe'])
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('slot=red')
  })

  it('fetchAugmentLootQuests maps the quests on the augment detail, chest included', async () => {
    mockFetchResponse({
      id: 1902,
      name: 'Solar Gem of Physical Resistance Rating (Heroic)',
      quests: [API_ITEM_DETAIL.quests[0], { ...API_ITEM_DETAIL.quests[0], id: 12, chest: null }],
    })
    const lootQuests = await fetchAugmentLootQuests(1902)
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/v1/augments/1902')
    expect(lootQuests.map((q) => [q.id, q.chests])).toEqual([
      [11, ['raid warded chest']],
      [12, []],
    ])
  })
})
