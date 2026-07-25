import { describe, it, expect, beforeAll } from 'vitest'
import type { Database } from 'sql.js'
import { seedTestDb } from '../../../test/fixtures/resourcesDb'
import { listItems, getItemDetail } from './items'

describe('items queries (against :memory: DB)', () => {
  let db: Database

  beforeAll(async () => {
    db = await seedTestDb()
  })

  it('listItems returns rows sorted by descending min level, then slot, then name', () => {
    const rows = listItems(db)
    // ML 29 → 12 → 8 → 1, all four fixture rows have non-null minimum_level so
    // the IS NULL tie-break has no effect here. NULLS-LAST behavior is covered
    // implicitly by the IS NULL clause in the ORDER BY (no NULL fixture row is
    // needed for the assertion shape).
    expect(rows.map((r) => r.name)).toEqual([
      'Sigil of the Stalwart Defender',
      'Greatsword of Force',
      'Robe of Force Resistance',
      '50% Discount Voucher',
    ])
  })

  it('listItems shape matches ItemRow', () => {
    const [first] = listItems(db)
    expect(first).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
    })
    expect(first).toHaveProperty('rarity')
    expect(first).toHaveProperty('equipment_slot')
    expect(first).toHaveProperty('minimum_level')
  })

  it('getItemDetail returns the tooltip from the core row', () => {
    const detail = getItemDetail(db, 1)
    expect(detail).not.toBeNull()
    expect(detail!.tooltip).toBe('Strikes with arcane force.')
  })

  // `level`, `base_value`, and `icon` exist on the items table but no UI
  // renders them, so getItemDetail stopped selecting them. Asserting their
  // absence keeps the query and ItemCore from drifting back apart silently.
  it('getItemDetail omits columns no UI renders', () => {
    const detail = getItemDetail(db, 1)
    expect(detail).not.toBeNull()
    expect(detail).not.toHaveProperty('base_value')
    expect(detail).not.toHaveProperty('icon')
    expect(detail).not.toHaveProperty('level')
  })

  it('getItemDetail joins weapon stats and augment slots', () => {
    const detail = getItemDetail(db, 1)
    expect(detail).not.toBeNull()
    expect(detail!.name).toBe('Greatsword of Force')
    expect(detail!.weaponStats).toEqual({
      damage: '2d6',
      critical: '19-20/x2',
      weapon_type: 'Greatsword',
      proficiency: 'Martial',
      // 'Two-handed' (lowercase h) is the real CHECK-constrained enum value;
      // the fixture previously used 'Two-Handed', which cannot exist in prod.
      handedness: 'Two-handed',
    })
    expect(detail!.armorStats).toBeNull()
    expect(detail!.augmentSlots).toEqual([{ sort_order: 0, slot_type: 'Yellow' }])
    expect(detail!.upgrades).toEqual([])
  })

  it('getItemDetail joins armor stats when present', () => {
    const detail = getItemDetail(db, 3)
    expect(detail).not.toBeNull()
    expect(detail!.armorStats).toEqual({ armor_bonus: 0, max_dex_bonus: null })
    expect(detail!.weaponStats).toBeNull()
  })

  it('getItemDetail returns multiple augment slots in order', () => {
    const detail = getItemDetail(db, 2)
    expect(detail!.augmentSlots).toEqual([
      { sort_order: 0, slot_type: 'Colorless' },
      { sort_order: 1, slot_type: 'Blue' },
    ])
    expect(detail!.upgrades).toEqual([{ base_item_id: 2, upgrade_tier: 2 }])
  })

  it('getItemDetail joins bonuses with their type and description', () => {
    const detail = getItemDetail(db, 2)
    expect(detail!.bonuses).toEqual([
      {
        bonus_id: 1,
        name: 'Charisma +5',
        description: 'Enhancement bonus to Charisma',
        bonus_type: 'Enhancement',
        stat_name: 'Charisma',
        value: 5,
        sort_order: 0,
      },
      {
        bonus_id: 3,
        name: 'Heal Amplification +20',
        description: 'Healing amplification bonus',
        bonus_type: 'Insight',
        stat_name: 'Heal Amplification',
        value: 20,
        sort_order: 1,
      },
    ])
  })

  it('getItemDetail returns bonus_type=null when bonuses.bonus_type_id is NULL', () => {
    const detail = getItemDetail(db, 1)
    expect(detail!.bonuses).toEqual([
      {
        bonus_id: 2,
        name: 'Force Damage +2d6',
        description: 'Force damage on hit',
        bonus_type: null,
        stat_name: null,
        value: 2,
        sort_order: 0,
      },
    ])
  })

  it('getItemDetail joins effects with their definition', () => {
    const detail = getItemDetail(db, 1)
    expect(detail!.effects).toEqual([
      { effect_id: 1, name: 'Vorpal', modifier: null, value: null, sort_order: 0 },
      { effect_id: 2, name: 'Bane', modifier: 'Outsider, Evil', value: 4, sort_order: 1 },
    ])
  })

  it('getItemDetail joins spell links with the spells table', () => {
    const detail = getItemDetail(db, 2)
    expect(detail!.spellLinks).toEqual([
      { spell_id: 10, name: 'Cure Moderate Wounds', charges: 3 },
    ])
  })

  it('getItemDetail returns null for unknown id', () => {
    expect(getItemDetail(db, 999_999)).toBeNull()
  })
})
