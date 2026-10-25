import { slugFromPathSegment, type Slug } from '../../../lib/api'
import type {
  AugmentDetail,
  AugmentSummary,
  Effect,
  EffectBonus,
  EffectDamage,
  Item,
  ItemArmorStats,
  ItemAugmentSlot,
  ItemSource,
  ItemWeaponStats,
  LootQuest,
} from '../queries/items'
import type { SetDetail } from '../queries/sets'
import type { SourceDetail, SourceRecipe } from '../queries/sources'

export function gallerySlug(text: string): Slug {
  const slug = slugFromPathSegment(`gallery-${text}`)
  if (slug === null) throw new Error(`Invalid gallery slug: ${text}`)
  return slug
}

function galleryItem(slugText: string, name: string, overrides: Partial<Item> = {}): Item {
  return {
    slug: gallerySlug(slugText),
    name,
    equipmentSlot: 'Trinket',
    category: 'Trinket',
    type: null,
    minimumLevel: 20,
    enhancementBonus: null,
    material: null,
    requiredRace: null,
    description: null,
    dropLocation: null,
    sets: [],
    canAcceptSentience: false,
    isMinorArtifact: false,
    wikiUrl: `https://ddowiki.com/page/Item:${name.replaceAll(' ', '_')}`,
    isLegacy: false,
    weaponStats: null,
    armorStats: null,
    augmentSlots: [],
    modifiers: [],
    effects: [],
    clickies: [],
    quests: [],
    questChains: [],
    sagas: [],
    adventurePackDrops: [],
    sourcesBeyondQuests: [],
    ...overrides,
  }
}

function galleryEffect(
  slugText: string,
  name: string,
  bonusType: string | null,
  value: number | null,
  sortOrder: number,
  overrides: Partial<Effect> = {},
): Effect {
  return {
    slug: gallerySlug(slugText),
    name,
    verboseName: name,
    description: null,
    bonusType,
    value,
    value2: null,
    tier: null,
    bonuses: [],
    damage: [],
    sortOrder,
    ...overrides,
  }
}

function effectBonus(
  statName: string,
  bonusType: string,
  value: number,
  overrides: Partial<EffectBonus> = {},
): EffectBonus {
  return {
    statName,
    statCategory: 'Ability',
    bonusType,
    value,
    amountSource: 'owner',
    scale: 1,
    group: null,
    ...overrides,
  }
}

const FIRE_DAMAGE: EffectDamage = {
  trigger: 'On hit',
  damageType: 'Fire',
  diceNumber: 1,
  diceSides: 6,
  diceBonus: 0,
  amountFrom: 1,
  scale: 1,
}

function weaponStats(overrides: Partial<ItemWeaponStats>): ItemWeaponStats {
  return {
    critical: null,
    baseDiceCount: null,
    baseDiceSides: null,
    baseDiceBonus: null,
    damageMultiplier: null,
    criticalThreatRange: null,
    criticalMultiplier: null,
    weaponType: 'Longsword',
    proficiency: 'Martial Weapon Proficiency',
    handedness: 'One-handed',
    attackModifier: null,
    damageModifier: null,
    damageReductionBypasses: [],
    ...overrides,
  }
}

function armorStats(overrides: Partial<ItemArmorStats>): ItemArmorStats {
  return {
    armorType: 'Heavy',
    armorBonus: null,
    maximumDexterityBonus: null,
    arcaneSpellFailurePercent: null,
    armorCheckPenalty: null,
    shieldBonus: null,
    damageReduction: null,
    ...overrides,
  }
}

function questDrop(slugText: string, name: string, overrides: Partial<LootQuest> = {}): LootQuest {
  return {
    slug: gallerySlug(slugText),
    name,
    level: 12,
    epicLevel: null,
    pack: null,
    patron: null,
    isEndReward: false,
    isRaid: false,
    isRareLoot: false,
    isFreeToPlay: false,
    chests: [],
    ...overrides,
  }
}

function itemSource(
  kind: ItemSource['kind'],
  slugText: string | null,
  name: string,
  overrides: Partial<ItemSource> = {},
): ItemSource {
  return {
    kind,
    slug: slugText === null ? null : gallerySlug(slugText),
    key: `${kind}-${slugText ?? name}`,
    name,
    vendorLocation: null,
    price: [],
    chest: null,
    characterLevel: null,
    isRareLoot: false,
    wikiUrl: null,
    ...overrides,
  }
}

function augmentSlot(
  sortOrder: number,
  label: string,
  family: string,
  overrides: Partial<ItemAugmentSlot> = {},
): ItemAugmentSlot {
  return { sortOrder, label, family, qualifier: null, options: [], ...overrides }
}

const STORMFORGED_SET = {
  slug: gallerySlug('stormforged'),
  name: 'Stormforged',
  icon: null,
}
const MOONLIT_SET = { slug: gallerySlug('moonlit-guard'), name: 'Moonlit Guard', icon: null }

const STORMFORGED_BONUS_EFFECTS = [
  galleryEffect('storm-resistance', 'Electric Resistance', 'Enhancement', 10, 0),
  galleryEffect('storm-lore', 'Lightning Lore', 'Insightful', 20, 0, {
    description: 'Adds to the damage of your lightning spells.',
  }),
  galleryEffect('storm-fury', 'Stormfury', 'Quality', 3, 0, { damage: [FIRE_DAMAGE] }),
]

export const GALLERY_SETS: readonly SetDetail[] = [
  {
    slug: STORMFORGED_SET.slug,
    name: STORMFORGED_SET.name,
    items: [
      {
        slug: gallerySlug('stormforged-helm'),
        name: 'Stormforged Helm',
        slot: 'Head',
        minimumLevel: 24,
      },
      {
        slug: gallerySlug('stormforged-gauntlets'),
        name: 'Stormforged Gauntlets',
        slot: 'Hands',
        minimumLevel: 24,
      },
      {
        slug: gallerySlug('stormforged-boots'),
        name: 'Stormforged Boots',
        slot: 'Feet',
        minimumLevel: 24,
      },
    ],
    tiers: [
      { equippedCount: 2, effects: [STORMFORGED_BONUS_EFFECTS[0], STORMFORGED_BONUS_EFFECTS[1]] },
      { equippedCount: 3, effects: [STORMFORGED_BONUS_EFFECTS[2]] },
    ],
  },
  {
    slug: MOONLIT_SET.slug,
    name: MOONLIT_SET.name,
    items: [
      {
        slug: gallerySlug('stormforged-helm'),
        name: 'Stormforged Helm',
        slot: 'Head',
        minimumLevel: 24,
      },
      { slug: gallerySlug('moonlit-cloak'), name: 'Moonlit Cloak', slot: 'Back', minimumLevel: 24 },
      { slug: gallerySlug('moonlit-ring'), name: 'Moonlit Ring', slot: 'Ring', minimumLevel: 24 },
    ],
    tiers: [
      {
        equippedCount: 2,
        effects: [galleryEffect('moon-ward', 'Moon Ward', 'Profane', 15, 0)],
      },
    ],
  },
]

const ENCHANTED_RING_EFFECTS: Effect[] = [
  galleryEffect('plain', 'Constitution', 'Enhancement', 6, 0),
  galleryEffect('tiered', 'Sheltering', 'Quality', 30, 1, {
    tier: { group: 'Sheltering', rank: 2 },
  }),
  galleryEffect('damage', 'Flame Strike', null, null, 2, { damage: [FIRE_DAMAGE] }),
  galleryEffect('two-values', 'Spell Penetration', 'Competence', 3, 3, { value2: 5 }),
  galleryEffect('calculated', 'Fortification', 'Enhancement', 12, 4, {
    bonuses: [
      effectBonus('Fortification', 'Enhancement', 12, { amountSource: 'default', scale: 2 }),
    ],
  }),
  galleryEffect('grouped', 'Spell Power', 'Equipment', 15, 5, {
    bonuses: [
      effectBonus('Fire Spell Power', 'Equipment', 15, {
        group: { slug: gallerySlug('spell-power'), name: 'Spell Power' },
      }),
      effectBonus('Cold Spell Power', 'Equipment', 15, {
        group: { slug: gallerySlug('spell-power'), name: 'Spell Power' },
      }),
    ],
  }),
  galleryEffect('untyped', 'Ghostly Touch', null, null, 6),
  galleryEffect('described', 'Deathblock', 'Insightful', null, 7, {
    verboseName: 'Deathblock (instant death immunity)',
    description: 'Immune to effects that kill outright.',
  }),
]

const AUGMENT_SLOTS_EVERY_FAMILY: ItemAugmentSlot[] = [
  augmentSlot(0, 'blue', 'standard'),
  augmentSlot(1, 'red', 'standard'),
  augmentSlot(2, 'yellow', 'standard'),
  augmentSlot(3, 'green', 'standard'),
  augmentSlot(4, 'purple', 'standard'),
  augmentSlot(5, 'orange', 'standard'),
  augmentSlot(6, 'colorless', 'standard'),
  augmentSlot(7, 'sun', 'standard'),
  augmentSlot(8, 'moon', 'standard'),
  augmentSlot(9, 'isle of dread: set bonus', 'dino'),
  augmentSlot(10, 'lamordia: melancholic (accessory)', 'lamordia', { qualifier: 'accessory' }),
  augmentSlot(11, 'crafting: upgradeable - primary augment', 'crafting', {
    options: [
      {
        name: 'Add a Blue augment slot',
        description: 'Add a Blue augment slot to this item',
        minimumLevel: 27,
      },
    ],
  }),
]

export const GALLERY_AUGMENTS: readonly AugmentDetail[] = [
  {
    slug: gallerySlug('augment-blue-skill'),
    name: 'Blue Skill Gem',
    minimumLevel: 8,
    slots: ['blue'],
    recipes: [],
    description: 'A cut gem that sharpens a skill.',
    effectDescription: null,
    effects: [galleryEffect('augment-skill', 'Spot', 'Enhancement', 10, 0)],
    modifiers: [],
  },
  {
    slug: gallerySlug('augment-blue-ward'),
    name: 'Blue Warding Gem',
    minimumLevel: null,
    slots: ['blue', 'colorless'],
    recipes: [
      {
        system: 'Cannith',
        tier: 'heroic',
        ingredientCosts: [{ ingredient: 'Cannith Essence', quantity: 3 }],
      },
    ],
    description: null,
    effectDescription: 'Ward the wearer against energy.',
    effects: [],
    modifiers: [],
  },
  {
    slug: gallerySlug('augment-red-power'),
    name: 'Red Power Gem',
    minimumLevel: 12,
    slots: ['red'],
    recipes: [],
    description: null,
    effectDescription: null,
    effects: [galleryEffect('augment-power', 'Melee Power', 'Enhancement', 8, 0)],
    modifiers: [],
  },
]

export const GALLERY_ITEMS: readonly Item[] = [
  galleryItem('legacy-craftable-ring', 'Legacy Craftable Ring', {
    equipmentSlot: 'Ring',
    category: 'Ring',
    minimumLevel: 28,
    isLegacy: true,
    description:
      'A ring from an older age of the world, forged for adventurers who delved into the deepest vaults. Its band hums faintly whenever a spellcaster stands nearby, and the stone at its centre shifts colour with the mood of its wearer. Few of these remain, and fewer still keep their full power.',
    augmentSlots: [augmentSlot(0, 'blue', 'standard'), augmentSlot(1, 'red', 'standard')],
    effects: [galleryEffect('plain', 'Constitution', 'Enhancement', 6, 0)],
    quests: [
      questDrop('vault-of-shadows', 'The Vault of Shadows', {
        pack: 'Gallery Pack',
        level: 28,
        epicLevel: 32,
        isRaid: true,
        isRareLoot: true,
        chests: ['raid end chest'],
      }),
    ],
    sourcesBeyondQuests: [
      itemSource('craftingSystem', 'gallery-forge', 'Gallery Forge', {
        wikiUrl: 'https://ddowiki.com/page/Gallery_Forge',
      }),
    ],
  }),
  galleryItem('plain-trinket', 'Plain Trinket', { minimumLevel: null, wikiUrl: null }),
  galleryItem('longsword', 'Gallery Longsword', {
    equipmentSlot: 'Main Hand',
    category: 'Weapon',
    type: 'Longsword',
    minimumLevel: 26,
    enhancementBonus: 5,
    material: 'Adamantine',
    description: 'A balanced blade with a numeric threat range and multiplier.',
    weaponStats: weaponStats({
      critical: '19-20/x2',
      baseDiceCount: 1,
      baseDiceSides: 8,
      baseDiceBonus: 0,
      damageMultiplier: 1,
      criticalThreatRange: 2,
      criticalMultiplier: 2,
      attackModifier: 'Strength',
      damageModifier: 'Strength',
      damageReductionBypasses: ['Adamantine', 'Magic', 'Silver'],
    }),
  }),
  galleryItem('greataxe', 'Gallery Greataxe', {
    equipmentSlot: 'Main Hand',
    category: 'Weapon',
    type: 'Greataxe',
    minimumLevel: 26,
    weaponStats: weaponStats({
      critical: '19-20/x3',
      baseDiceCount: 1,
      baseDiceSides: 12,
      baseDiceBonus: 4,
      damageMultiplier: 1.5,
      weaponType: 'Greataxe',
      handedness: 'Two-handed',
      attackModifier: 'Dexterity',
    }),
  }),
  galleryItem('odd-weapon', 'Gallery Oddity', {
    equipmentSlot: 'Main Hand',
    category: 'Weapon',
    weaponStats: weaponStats({
      critical: 'Special',
      weaponType: 'Unknown',
      proficiency: null,
      handedness: null,
    }),
  }),
  galleryItem('tower-shield', 'Gallery Tower Shield', {
    equipmentSlot: 'Off Hand',
    category: 'Shield',
    type: 'Tower Shield',
    minimumLevel: 26,
    enhancementBonus: 4,
    material: 'Mithral',
    armorStats: armorStats({
      armorType: 'Tower',
      shieldBonus: 8,
      maximumDexterityBonus: 2,
      arcaneSpellFailurePercent: 40,
      armorCheckPenalty: -10,
    }),
  }),
  galleryItem('plate', 'Gallery Plate', {
    equipmentSlot: 'Body',
    category: 'Armor',
    type: 'Full Plate',
    minimumLevel: 26,
    enhancementBonus: 6,
    material: 'Adamantine',
    requiredRace: 'Warforged',
    armorStats: armorStats({
      armorBonus: 16,
      maximumDexterityBonus: 1,
      arcaneSpellFailurePercent: 35,
      armorCheckPenalty: -6,
      damageReduction: 5,
    }),
  }),
  galleryItem('cloak', 'Gallery Cloak', {
    equipmentSlot: 'Back',
    category: 'Cloak',
    material: 'Silk',
    requiredRace: 'Elf',
  }),
  galleryItem('enchanted-ring', 'Gallery Enchanted Ring', {
    equipmentSlot: 'Ring',
    category: 'Ring',
    minimumLevel: 30,
    enhancementBonus: 3,
    effects: ENCHANTED_RING_EFFECTS,
  }),
  galleryItem('stormforged-helm', 'Stormforged Helm', {
    equipmentSlot: 'Head',
    category: 'Helm',
    minimumLevel: 24,
    sets: [STORMFORGED_SET, MOONLIT_SET],
    effects: [galleryEffect('plain', 'Constitution', 'Enhancement', 6, 0)],
  }),
  galleryItem('stormforged-gauntlets', 'Stormforged Gauntlets', {
    equipmentSlot: 'Hands',
    category: 'Gloves',
    minimumLevel: 24,
    sets: [STORMFORGED_SET],
  }),
  galleryItem('stormforged-boots', 'Stormforged Boots', {
    equipmentSlot: 'Feet',
    category: 'Boots',
    minimumLevel: 24,
    sets: [STORMFORGED_SET],
  }),
  galleryItem('moonlit-cloak', 'Moonlit Cloak', {
    equipmentSlot: 'Back',
    category: 'Cloak',
    minimumLevel: 24,
    sets: [MOONLIT_SET],
  }),
  galleryItem('moonlit-ring', 'Moonlit Ring', {
    equipmentSlot: 'Ring',
    category: 'Ring',
    minimumLevel: 24,
    sets: [MOONLIT_SET],
  }),
  galleryItem('socketed-bracers', 'Gallery Socketed Bracers', {
    equipmentSlot: 'Wrist',
    category: 'Bracers',
    minimumLevel: 28,
    augmentSlots: AUGMENT_SLOTS_EVERY_FAMILY,
  }),
  galleryItem('quest-drops', 'Gallery Quest Drops', {
    quests: [
      questDrop('delvers-hollow', "Delver's Hollow", {
        pack: 'Gallery Pack',
        patron: 'The Free Agents',
      }),
      questDrop('vault-of-shadows', 'The Vault of Shadows', {
        pack: 'Gallery Pack',
        level: 28,
        epicLevel: 32,
        isRaid: true,
        isRareLoot: true,
        chests: ['raid end chest'],
      }),
      questDrop('free-tutorial', 'A Free Tutorial', {
        level: 2,
        isFreeToPlay: true,
        isEndReward: true,
        chests: ['any end chest', 'bonus chest'],
      }),
    ],
  }),
  galleryItem('chains-and-sagas', 'Gallery Chains And Sagas', {
    questChains: [
      {
        slug: gallerySlug('lost-seekers'),
        name: 'The Lost Seekers',
        isRareLoot: true,
        wikiUrl: 'https://ddowiki.com/page/The_Lost_Seekers',
      },
    ],
    sagas: [
      {
        slug: gallerySlug('mist-saga'),
        name: 'The Mists Saga',
        tier: 'legendary',
        isRareLoot: false,
        wikiUrl: null,
      },
    ],
    adventurePackDrops: [
      itemSource('adventurePack', 'gallery-pack', 'Gallery Pack', {
        chest: 'any end chest',
        isRareLoot: true,
      }),
    ],
  }),
  galleryItem('vendor-and-crafted', 'Gallery Vendor And Crafted', {
    sourcesBeyondQuests: [
      itemSource('vendor', 'gallery-merchant', 'Raam Lukress', {
        vendorLocation: 'Blue Water Inn',
        price: [
          { ingredient: 'Vistani Talisman', quantity: 40 },
          { ingredient: 'Gallery Dust', quantity: 2 },
        ],
      }),
      itemSource('craftingSystem', 'gallery-forge', 'Gallery Forge', {
        wikiUrl: 'https://ddowiki.com/page/Gallery_Forge',
      }),
      itemSource('challengePack', null, 'Gallery Challenge', { isRareLoot: true }),
      itemSource('event', 'gallery-festival', 'Gallery Festival'),
      itemSource('starter', null, 'Starting gear'),
    ],
  }),
  galleryItem('drop-location-only', 'Gallery Drop Location', {
    dropLocation: 'Dropped by the gallery guardian in the Hollow Vault.',
  }),
  galleryItem('clickies', 'Gallery Clickies', {
    equipmentSlot: 'Trinket',
    clickies: [
      {
        name: 'Corrupted Fire Blast',
        description:
          'Target: Foe, Directional, Breakable\nSchool: Evocation\nSpell Resistance: No\nDeals fire damage to a target with a cone shaped blast of fire. At higher charge\ntiers the blast is larger.\n\nCharge Tier 1: 4 to 10 + 1 to 2 per Artificer Level\nCharge Tier 2: 5 to 15 + 1 to 4 per Artificer Level',
      },
      {
        name: 'Curse Absorption',
        description: 'Curse Absorption: This effect absorbs curses targeted at the wearer.',
      },
      { name: 'Mystery', description: null },
    ],
  }),
]

const GALLERY_ITEM_BY_SLUG: ReadonlyMap<Slug, Item> = new Map(
  GALLERY_ITEMS.map((item) => [item.slug, item]),
)

const RECIPES_BY_SOURCE_NAME: Record<string, SourceRecipe[]> = {
  'Gallery Forge': [{ name: 'Gallery Ring Recipe', outputs: ['Legacy Craftable Ring'] }],
}

export function galleryItemBySlug(slug: Slug): Item {
  const item = GALLERY_ITEM_BY_SLUG.get(slug)
  if (!item) throw new Error(`Unknown gallery item: ${slug}`)
  return item
}

export function gallerySourceDetail(
  kind: SourceDetail['kind'],
  slug: Slug,
  name: string,
): SourceDetail {
  const carriers = GALLERY_ITEMS.filter((item) =>
    [...item.adventurePackDrops, ...item.sourcesBeyondQuests].some(
      (source) => source.slug === slug,
    ),
  )
  return {
    kind,
    slug,
    name,
    pack: kind === 'questChain' ? 'Gallery Pack' : null,
    isFreeToPlay: kind === 'adventurePack' ? false : null,
    npc: kind === 'vendor' ? 'Raam Lukress' : null,
    location: kind === 'vendor' ? 'Blue Water Inn' : null,
    ingredientCount: kind === 'craftingSystem' ? 4 : null,
    items: carriers.map((item) => ({
      slug: item.slug,
      name: item.name,
      slot: item.equipmentSlot,
      minimumLevel: item.minimumLevel,
      isRareLoot: false,
      chest: null,
      price: [],
      tier: null,
      pack: null,
    })),
    quests:
      kind === 'questChain' || kind === 'saga'
        ? [{ slug: gallerySlug('delvers-hollow'), name: "Delver's Hollow", level: 12 }]
        : [],
    recipes: RECIPES_BY_SOURCE_NAME[name] ?? [],
  }
}

export function galleryAugmentSummary(augment: AugmentDetail): AugmentSummary {
  return {
    slug: augment.slug,
    name: augment.name,
    minimumLevel: augment.minimumLevel,
    slots: augment.slots,
    recipes: augment.recipes,
  }
}
