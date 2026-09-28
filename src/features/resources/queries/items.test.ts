import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ApiAugment, ApiItemDetail, ApiItemRow } from '../../../lib/api'
import {
  fetchAugmentsForSlot,
  fetchItemIdsByStat,
  fetchItemRows,
  isFamilySlot,
  slotTakesCandidateList,
  toAugmentCandidate,
  toItemDetail,
  toItemRow,
} from './items'

afterEach(() => {
  vi.restoreAllMocks()
})

function apiRow(overrides: Partial<ApiItemRow> = {}): ApiItemRow {
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
    ...overrides,
  }
}

const API_DETAIL: ApiItemDetail = {
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
    { id: 3, name: 'Fire Spell Power +54', description: null, stat: 'Fire Spell Power', stat_category: 'magical', bonus_type: 'Enhancement', value: 54, value2: null },
  ],
  effects: [{ id: 9, name: 'Supreme Good', description: 'Smites.', value: null, target: 'All' }],
  augment_slots: [
    { sort_order: 0, slot_type_id: 4, label: 'crafting: attuned to heroism 1', family: 'crafting', variant: 'attuned to heroism 1', qualifier: null, options: [{ name: 'Planar Conflux', description: null, min_level: 23 }] },
    { sort_order: 1, slot_type_id: 1, label: 'red', family: 'standard', variant: 'red', qualifier: null, options: [] },
  ],
  clickies: [{ name: 'Acid Shot', clickie_id: 2, spell_id: null, description: 'Shoots acid.', icon: null }],
  set: { id: 5, name: 'Eminence of Winter', icon: null },
  quests: [{ id: 11, name: 'Caught in the Web', level: 20, epic_level: null, is_raid: true, is_rare: true, pack: 'Web of Chaos', patron: 'The Twelve', loot_type: 'raid', duration: 'Long', is_free_to_play: false, difficulties: ['normal', 'hard', 'elite'] }],
}

describe('mappers', () => {
  it('toItemRow renames the API columns the picker reads', () => {
    expect(toItemRow(apiRow())).toEqual({
      id: 1,
      name: 'Bloodstone',
      equipment_slot: 'Trinket',
      item_category: 'Jewelry',
      minimum_level: 12,
      pack: 'Vault of Night',
      is_raid: true,
      is_rare: false,
    })
  })

  it('toItemRow carries the rare-loot flag', () => {
    expect(toItemRow(apiRow({ is_rare: true })).is_rare).toBe(true)
  })

  it('toItemDetail nests every satellite the drawer renders', () => {
    const d = toItemDetail(API_DETAIL)
    expect(d.equipment_slot).toBe('Main Hand')
    expect(d.enhancement_bonus).toBe(7)
    expect(d.set_name).toBe('Eminence of Winter')
    expect(d.weaponStats?.dr_bypass).toHaveLength(4)
    expect(d.armorStats).toBeNull()
    expect(d.bonuses[0]).toEqual({ bonus_id: 3, name: 'Fire Spell Power +54', description: null, bonus_type: 'Enhancement', stat_name: 'Fire Spell Power', value: 54, sort_order: 0 })
    expect(d.effects[0]).toEqual({ effect_id: 9, name: 'Supreme Good', description: 'Smites.', target: 'All', value: null, sort_order: 0 })
    expect(d.augmentSlots[0].options[0].name).toBe('Planar Conflux')
    expect(d.clickies).toEqual([{ name: 'Acid Shot', description: 'Shoots acid.' }])
    expect(d.quests[0]).toEqual({ quest_id: 11, name: 'Caught in the Web', level: 20, pack: 'Web of Chaos', patron: 'The Twelve', loot_type: 'raid', is_raid: true, is_rare: true, duration: 'Long', is_free_to_play: false })
  })

  it('toAugmentCandidate flattens bonus labels', () => {
    const a: ApiAugment = { id: 2, name: 'Silverscale', family: 'DinosaurBone', description: null, min_level: 31, icon: null, slots: ['isle of dread: scale (armor)'], bonuses: [{ id: 1, name: 'Healing Amplification +56', description: null, stat: 'Healing Amplification', stat_category: 'other', bonus_type: 'Competence', value: 56, value2: null }] }
    expect(toAugmentCandidate(a)).toEqual({ augment_id: 2, name: 'Silverscale', min_level: 31, bonuses: ['Healing Amplification +56'] })
  })

  it('slot rules: families and Sun/Moon get candidate lists', () => {
    expect(isFamilySlot('standard')).toBe(false)
    expect(isFamilySlot('lamordia')).toBe(true)
    expect(slotTakesCandidateList('standard', 'sun')).toBe(true)
    expect(slotTakesCandidateList('standard', 'red')).toBe(false)
    expect(slotTakesCandidateList('crafting', 'crafting: tier 2')).toBe(true)
  })
})

describe('fetchers', () => {
  function mockJson(body: unknown): void {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }))
  }

  it('fetchItemRows asks for the whole list and sorts by level desc, slot, name; unleveled last', async () => {
    mockJson({
      total: 4,
      limit: 10000,
      offset: 0,
      items: [
        apiRow({ id: 1, name: 'b', minimum_level: 8, slot: 'Ring' }),
        apiRow({ id: 2, name: 'a', minimum_level: null }),
        apiRow({ id: 3, name: 'c', minimum_level: 29, slot: 'Back' }),
        apiRow({ id: 4, name: 'A', minimum_level: 8, slot: 'Ring' }),
      ],
    })
    const rows = await fetchItemRows()
    expect(rows.map((r) => r.id)).toEqual([3, 4, 1, 2])
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/v1/items?limit=10000')
  })

  it('fetchItemIdsByStat returns a set of ids from the filtered list', async () => {
    mockJson({ total: 2, limit: 10000, offset: 0, items: [apiRow({ id: 5 }), apiRow({ id: 6 })] })
    await expect(fetchItemIdsByStat('Strength')).resolves.toEqual(new Set([5, 6]))
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('stat=Strength')
  })

  it('fetchAugmentsForSlot orders by level then name', async () => {
    const aug = (id: number, name: string, min_level: number | null): ApiAugment => ({ id, name, family: 'Ruby', description: null, min_level, icon: null, slots: ['red'], bonuses: [] })
    mockJson({ total: 3, limit: 10000, offset: 0, augments: [aug(1, 'Zed', 4), aug(2, 'Abe', null), aug(3, 'Bob', 4)] })
    const out = await fetchAugmentsForSlot('red')
    expect(out.map((a) => a.name)).toEqual(['Bob', 'Zed', 'Abe'])
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('slot=red')
  })
})
