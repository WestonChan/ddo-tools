import {
  ApiError,
  API_RESPONSE_ERROR,
  assertApiResponseFields,
  fetchApiPage,
  fetchValidatedApiJson,
  isApiEffectList,
  isApiEffectDetail,
  isApiEffectVocabularyRow,
  multiValueFilterParameters,
  WHOLE_LIST_PAGE_LIMIT,
} from '../../../lib/api'
import type {
  ApiAdventurePack,
  ApiAugment,
  ApiAugmentDetail,
  ApiCraftingRecipe,
  ApiCraftingTier,
  ApiEffect,
  ApiEffectBonusGroup,
  ApiEffectDetail,
  ApiEffectVocabularyRow,
  ApiItemAdventurePack,
  ApiItemChallengePack,
  ApiItemCraftingSystem,
  ApiItemDetail,
  ApiItemEvent,
  ApiItemVendor,
  ApiItemRow,
  ApiEquipmentSlot,
  ApiLootQuest,
  ApiModifier,
  ApiQueryParameters,
  ApiQuestSummary,
  ApiEffectDamage,
} from '../../../lib/api'

export const ITEM_PAGE_SIZE = 200
const ITEM_SORT_FIELD_BY_COLUMN: Record<string, string> = {
  name: 'name',
  ml: 'minimum_level',
  slot: 'slot',
  pack: 'pack',
  raid: 'is_raid',
  rare: 'is_rare',
}

export function isItemSortColumn(columnKey: string): boolean {
  return Object.hasOwn(ITEM_SORT_FIELD_BY_COLUMN, columnKey)
}

export interface ItemSummary {
  id: number
  name: string
  equipmentSlot: string
  category: string
  minimumLevel: number | null
  pack: string | null
  isRaidLoot: boolean
  isRareLoot: boolean
  isLegacy: boolean
}

export interface ItemListFilters {
  ml: { min: string; max: string }
  slot: string[]
  bonuses: string[]
  bonusMatch: 'any' | 'all'
  set: string[]
  setMatch: 'any' | 'all'
  pack: string[]
  raid: string[]
  isRareOnly: boolean
  isRaidOnly: boolean
}

export interface ItemListSort {
  key: string
  direction: 'asc' | 'desc'
}

export const EMPTY_ITEM_FILTERS: ItemListFilters = {
  ml: { min: '', max: '' },
  slot: [],
  bonuses: [],
  bonusMatch: 'any',
  set: [],
  setMatch: 'any',
  pack: [],
  raid: [],
  isRareOnly: false,
  isRaidOnly: false,
}

export interface ItemPage {
  total: number
  items: ItemSummary[]
}

export interface ItemAttributes {
  id: number
  name: string
  equipmentSlot: string
  category: string
  type: string | null
  minimumLevel: number | null
  enhancementBonus: number | null
  material: string | null
  requiredRace: string | null
  description: string | null
  dropLocation: string | null
  setName: string | null
  setId: number | null
  canAcceptSentience: boolean
  isMinorArtifact: boolean
  wikiUrl: string | null
  isLegacy: boolean
}

export interface ItemWeaponStats {
  critical: string | null
  baseDiceCount: number | null
  baseDiceSides: number | null
  baseDiceBonus: number | null
  damageMultiplier: number | null
  criticalThreatRange: number | null
  criticalMultiplier: number | null
  weaponType: string
  proficiency: string | null
  handedness: string | null
  attackModifier: string | null
  damageModifier: string | null
  damageReductionBypasses: string[]
}

export interface ItemArmorStats {
  armorType: string
  armorBonus: number | null
  maximumDexterityBonus: number | null
  arcaneSpellFailurePercent: number | null
  armorCheckPenalty: number | null
  shieldBonus: number | null
  damageReduction: number | null
}

export interface ItemAugmentSlotOption {
  name: string
  description: string | null
  minimumLevel: number | null
}

export interface ItemAugmentSlot {
  sortOrder: number
  label: string
  family: string
  qualifier: string | null
  options: ItemAugmentSlotOption[]
}

export interface CraftingIngredientCost {
  ingredient: string
  quantity: number
}

export interface CraftingRecipe {
  system: string
  tier: ApiCraftingTier
  ingredientCosts: CraftingIngredientCost[]
}

export interface AugmentSummary {
  id: number
  name: string
  minimumLevel: number | null
  slots: string[]
  recipes: CraftingRecipe[]
}

export interface EffectBonus {
  statName: string
  statCategory: string
  bonusType: string
  value: number
  amountSource: 'owner' | 'default' | 'constant'
  scale: number
  group: ApiEffectBonusGroup | null
}

export interface EffectDamage {
  trigger: string
  damageType: string
  diceNumber: number
  diceSides: number
  diceBonus: number
  amountFrom: number
  scale: number
}

export interface Effect {
  id: number
  name: string
  kind?: ApiEffect['kind']
  verboseName: string
  description: string | null
  bonusType: string | null
  value: number | null
  value2: number | null
  tier: { group: string; rank: number } | null
  bonuses: EffectBonus[]
  damage: EffectDamage[]
  sortOrder: number
}

export interface ResourceModifier {
  id: number
  effectType: string
  displayName: string | null
  bonusType: string | null
  amounts: number[] | null
  value: string | null
  diceNumber: number[] | null
  diceSides: number[] | null
  diceBonus: number[] | null
  diceDamage: string | null
  damage: string | null
  isPercent: boolean
  cap: string | null
}

export interface AugmentDetail extends AugmentSummary {
  description: string | null
  effectDescription: string | null
  effects: Effect[]
  modifiers: ResourceModifier[]
}

export interface ItemClickie {
  name: string
  description: string | null
}

export interface LootQuest {
  id: number
  name: string
  level: number | null
  epicLevel: number | null
  pack: string | null
  patron: string | null
  isEndReward: boolean
  isRaid: boolean
  isRareLoot: boolean
  isFreeToPlay: boolean
  chests: string[]
}

export interface RewardingQuestChain {
  id: number
  name: string
  isRareLoot: boolean
  wikiUrl: string | null
}

export interface RewardingSaga {
  id: number
  name: string
  tier: string | null
  isRareLoot: boolean
  wikiUrl: string | null
}

export type ItemSourceKind =
  'adventurePack' | 'craftingSystem' | 'challengePack' | 'vendor' | 'event' | 'starter'

export interface ItemSource {
  kind: ItemSourceKind
  id: number | null
  key: string
  name: string
  vendorLocation: string | null
  cost: string | null
  chest: string | null
  characterLevel: number | null
  isRareLoot: boolean
  wikiUrl: string | null
}

export interface RaidQuest {
  id: number
  name: string
  pack: string | null
}

export interface Item extends ItemAttributes {
  weaponStats: ItemWeaponStats | null
  armorStats: ItemArmorStats | null
  augmentSlots: ItemAugmentSlot[]
  modifiers: ResourceModifier[]
  effects: Effect[]
  clickies: ItemClickie[]
  quests: LootQuest[]
  questChains: RewardingQuestChain[]
  sagas: RewardingSaga[]
  adventurePackDrops: ItemSource[]
  sourcesBeyondQuests: ItemSource[]
}

export function toItemSummary(apiItemRow: ApiItemRow, rowIndex = 0): ItemSummary {
  assertApiResponseFields(
    apiItemRow,
    '/v1/items',
    {
      id: 'number',
      name: 'string',
      slot: 'string',
      category: 'string',
      minimum_level: 'nullable-number',
      pack: 'nullable-string',
      is_raid: 'boolean',
      is_rare: 'boolean',
      is_legacy: 'boolean',
    },
    `items[${rowIndex}].`,
  )
  return {
    id: apiItemRow.id,
    name: apiItemRow.name,
    equipmentSlot: apiItemRow.slot,
    category: apiItemRow.category,
    minimumLevel: apiItemRow.minimum_level,
    pack: apiItemRow.pack,
    isRaidLoot: apiItemRow.is_raid,
    isRareLoot: apiItemRow.is_rare,
    isLegacy: apiItemRow.is_legacy,
  }
}

export function toItem(
  apiItemDetail: ApiItemDetail,
  path = `/v1/items/${apiItemDetail?.id ?? 'unknown'}`,
): Item {
  assertApiResponseFields(apiItemDetail, path, {
    augment_slots: 'array',
    modifiers: 'array',
    effects: 'array',
    clickies: 'array',
    quests: 'array',
    quest_chains: 'array',
    sagas: 'array',
    adventure_packs: 'array',
    crafting_systems: 'array',
    challenge_packs: 'array',
    vendors: 'array',
    events: 'array',
    starter_rewards: 'array',
    id: 'number',
    name: 'string',
    slot: 'string',
    category: 'string',
    item_type: 'nullable-string',
    minimum_level: 'nullable-number',
    enhancement_bonus: 'nullable-number',
    material: 'nullable-string',
    race_required: 'nullable-string',
    description: 'nullable-string',
    drop_location: 'nullable-string',
    set_name: 'nullable-string',
    accepts_sentience: 'boolean',
    is_minor_artifact: 'boolean',
    wiki_url: 'nullable-string',
    is_legacy: 'boolean',
    weapon: 'nullable-object',
    armor: 'nullable-object',
    set: 'nullable-object',
  })
  if (apiItemDetail.weapon)
    assertApiResponseFields(apiItemDetail.weapon, path, { dr_bypass: 'array' }, 'weapon.')
  apiItemDetail.augment_slots.forEach((slot, index) => {
    assertApiResponseFields(slot, path, { options: 'array' }, `augment_slots[${index}].`)
  })
  return {
    id: apiItemDetail.id,
    name: apiItemDetail.name,
    equipmentSlot: apiItemDetail.slot,
    category: apiItemDetail.category,
    type: apiItemDetail.item_type,
    minimumLevel: apiItemDetail.minimum_level,
    enhancementBonus: apiItemDetail.enhancement_bonus,
    material: apiItemDetail.material,
    requiredRace: apiItemDetail.race_required,
    description: apiItemDetail.description,
    dropLocation: apiItemDetail.drop_location,
    setName: apiItemDetail.set?.name ?? apiItemDetail.set_name,
    setId: apiItemDetail.set?.id ?? null,
    canAcceptSentience: apiItemDetail.accepts_sentience,
    isMinorArtifact: apiItemDetail.is_minor_artifact,
    wikiUrl: apiItemDetail.wiki_url,
    isLegacy: apiItemDetail.is_legacy,
    weaponStats: apiItemDetail.weapon
      ? {
          critical: apiItemDetail.weapon.critical,
          baseDiceCount: apiItemDetail.weapon.base_dice_count,
          baseDiceSides: apiItemDetail.weapon.base_dice_sides,
          baseDiceBonus: apiItemDetail.weapon.base_dice_bonus,
          damageMultiplier: apiItemDetail.weapon.damage_multiplier,
          criticalThreatRange: apiItemDetail.weapon.critical_threat_range,
          criticalMultiplier: apiItemDetail.weapon.critical_multiplier,
          weaponType: apiItemDetail.weapon.weapon_type,
          proficiency: apiItemDetail.weapon.proficiency,
          handedness: apiItemDetail.weapon.handedness,
          attackModifier: apiItemDetail.weapon.attack_modifier,
          damageModifier: apiItemDetail.weapon.damage_modifier,
          damageReductionBypasses: apiItemDetail.weapon.dr_bypass,
        }
      : null,
    armorStats: apiItemDetail.armor
      ? {
          armorType: apiItemDetail.armor.armor_type,
          armorBonus: apiItemDetail.armor.armor_bonus,
          maximumDexterityBonus: apiItemDetail.armor.max_dex_bonus,
          arcaneSpellFailurePercent: apiItemDetail.armor.arcane_spell_failure,
          armorCheckPenalty: apiItemDetail.armor.armor_check_penalty,
          shieldBonus: apiItemDetail.armor.shield_bonus,
          damageReduction: apiItemDetail.armor.damage_reduction,
        }
      : null,
    augmentSlots: apiItemDetail.augment_slots.map((s) => ({
      sortOrder: s.sort_order,
      label: s.label,
      family: s.family,
      qualifier: s.qualifier,
      options: s.options.map((o) => ({
        name: o.name,
        description: o.description,
        minimumLevel: o.min_level,
      })),
    })),
    modifiers: apiItemDetail.modifiers.map(toResourceModifier),
    effects: apiItemDetail.effects.map(toEffect),
    clickies: apiItemDetail.clickies.map((c) => ({ name: c.name, description: c.description })),
    quests: toLootQuests(apiItemDetail.quests),
    questChains: apiItemDetail.quest_chains.map((c) => ({
      id: c.id,
      name: c.name,
      isRareLoot: c.is_rare,
      wikiUrl: c.wiki_url,
    })),
    sagas: apiItemDetail.sagas.map((s) => ({
      id: s.id,
      name: s.name,
      tier: s.tier,
      isRareLoot: s.is_rare,
      wikiUrl: s.wiki_url,
    })),
    adventurePackDrops: apiItemDetail.adventure_packs.map((p, index) => ({
      ...namedSource('adventurePack', p),
      key: `adventurePack-${p.id}-${index}`,
      chest: p.chest,
    })),
    sourcesBeyondQuests: toSourcesBeyondQuests(apiItemDetail),
  }
}

function namedSource(
  kind: ItemSourceKind,
  apiSource:
    | ApiItemAdventurePack
    | ApiItemCraftingSystem
    | ApiItemChallengePack
    | ApiItemVendor
    | ApiItemEvent,
): ItemSource {
  return {
    kind,
    id: apiSource.id,
    key: `${kind}-${apiSource.id}`,
    name: apiSource.name,
    vendorLocation: null,
    cost: null,
    chest: null,
    characterLevel: null,
    isRareLoot: apiSource.is_rare,
    wikiUrl: apiSource.wiki_url ?? null,
  }
}

function toSourcesBeyondQuests(apiItemDetail: ApiItemDetail): ItemSource[] {
  return [
    ...apiItemDetail.crafting_systems.map((c) => namedSource('craftingSystem', c)),
    ...apiItemDetail.challenge_packs.map((c) => namedSource('challengePack', c)),
    ...apiItemDetail.vendors.map((v) => ({
      ...namedSource('vendor', v),
      vendorLocation: v.location,
      cost: v.cost,
    })),
    ...apiItemDetail.events.map((e) => namedSource('event', e)),
    ...apiItemDetail.starter_rewards.map((s) => ({
      kind: 'starter' as const,
      id: null,
      key: `starter-${s.character_level}`,
      name: `Starter gear at level ${s.character_level}`,
      vendorLocation: null,
      cost: null,
      chest: null,
      characterLevel: s.character_level,
      isRareLoot: false,
      wikiUrl: null,
    })),
  ]
}

function toLootQuests(apiLootQuests: ApiLootQuest[]): LootQuest[] {
  const lootQuestsById = new Map<number, LootQuest>()
  for (const apiLootQuest of apiLootQuests) {
    const lootQuest = lootQuestsById.get(apiLootQuest.id) ?? {
      id: apiLootQuest.id,
      name: apiLootQuest.name,
      level: apiLootQuest.level,
      epicLevel: apiLootQuest.epic_level,
      pack: apiLootQuest.pack,
      patron: apiLootQuest.patron,
      isEndReward: false,
      isRaid: false,
      isRareLoot: false,
      isFreeToPlay: apiLootQuest.is_free_to_play,
      chests: [],
    }
    lootQuest.isEndReward ||= apiLootQuest.loot_type === 'reward'
    lootQuest.isRaid ||= apiLootQuest.is_raid
    lootQuest.isRareLoot ||= apiLootQuest.is_rare
    if (apiLootQuest.chest && !lootQuest.chests.includes(apiLootQuest.chest))
      lootQuest.chests.push(apiLootQuest.chest)
    lootQuestsById.set(apiLootQuest.id, lootQuest)
  }
  return [...lootQuestsById.values()]
}

export function toAugmentSummary(apiAugment: ApiAugment): AugmentSummary {
  assertApiResponseFields(apiAugment, `/v1/augments/${apiAugment?.id ?? 'unknown'}`, {
    id: 'number',
    name: 'string',
    min_level: 'nullable-number',
    crafting: 'array',
    slots: 'array',
  })
  return {
    id: apiAugment.id,
    name: apiAugment.name,
    minimumLevel: apiAugment.min_level,
    slots: apiAugment.slots,
    recipes: apiAugment.crafting.map(toCraftingRecipe),
  }
}

function toResourceModifier(modifier: ApiModifier): ResourceModifier {
  return {
    id: modifier.id,
    effectType: modifier.effect_type,
    displayName: modifier.display_name,
    bonusType: modifier.bonus_type,
    amounts: modifier.amounts,
    value: modifier.value,
    diceNumber: modifier.dice_number,
    diceSides: modifier.dice_sides,
    diceBonus: modifier.dice_bonus,
    diceDamage: modifier.dice_damage,
    damage: modifier.damage,
    isPercent: modifier.percent,
    cap: modifier.cap,
  }
}

export function toAugmentDetail(apiAugment: ApiAugmentDetail): AugmentDetail {
  assertApiResponseFields(apiAugment, `/v1/augments/${apiAugment?.id ?? 'unknown'}`, {
    effects: 'array',
    modifiers: 'array',
  })
  return {
    ...toAugmentSummary(apiAugment),
    description: apiAugment.description,
    effectDescription: apiAugment.effect_description,
    effects: apiAugment.effects.map(toEffect),
    modifiers: apiAugment.modifiers.map(toResourceModifier),
  }
}

export function toEffect(apiEffect: ApiEffect, sortOrder: number): Effect {
  return {
    id: apiEffect.effect_id,
    name: apiEffect.name,
    ...(apiEffect.kind ? { kind: apiEffect.kind } : {}),
    verboseName: apiEffect.verbose_name,
    description: apiEffect.description ?? null,
    bonusType: apiEffect.bonus_type ?? null,
    value: apiEffect.value ?? null,
    value2: apiEffect.value2 ?? null,
    tier: apiEffect.tier ?? null,
    bonuses: apiEffect.bonuses.map((bonus) => ({
      statName: bonus.stat,
      statCategory: bonus.stat_category,
      bonusType: bonus.bonus_type,
      value: bonus.value,
      amountSource: bonus.amount_source,
      scale: bonus.scale,
      group: bonus.group ?? null,
    })),
    damage: apiEffect.damage.map(toEffectDamage),
    sortOrder,
  }
}

export function toEffectDamage(damage: ApiEffectDamage): EffectDamage {
  return {
    trigger: damage.trigger,
    damageType: damage.damage_type,
    diceNumber: damage.dice_number,
    diceSides: damage.dice_sides,
    diceBonus: damage.dice_bonus,
    amountFrom: damage.amount_from,
    scale: damage.scale,
  }
}

function toCraftingRecipe(apiRecipe: ApiCraftingRecipe): CraftingRecipe {
  assertApiResponseFields(apiRecipe, '/v1/augments', {
    system: 'string',
    tier: 'string',
    cost: 'array',
  })
  return {
    system: apiRecipe.system,
    tier: apiRecipe.tier,
    ingredientCosts: apiRecipe.cost.map((c) => ({
      ingredient: c.ingredient,
      quantity: c.quantity,
    })),
  }
}

export function itemListParameters(
  filters: ItemListFilters,
  searchQuery: string,
  includesSetBonuses: boolean,
  offset = 0,
  sort: ItemListSort | null = null,
): ApiQueryParameters {
  const sortField = sort ? ITEM_SORT_FIELD_BY_COLUMN[sort.key] : undefined
  return {
    q: searchQuery.trim() || undefined,
    ...multiValueFilterParameters('slot', filters.slot),
    min_level: filters.ml.min || undefined,
    max_level: filters.ml.max || undefined,
    ...multiValueFilterParameters('pack', filters.pack),
    ...multiValueFilterParameters('quest', filters.raid),
    ...multiValueFilterParameters('bonus', filters.bonuses, filters.bonusMatch),
    ...multiValueFilterParameters('set', filters.set, filters.setMatch),
    include_set_bonuses: filters.bonuses.length > 0 && includesSetBonuses,
    rare: filters.isRareOnly,
    raid: filters.isRaidOnly,
    sort: sortField
      ? [
          `${sort?.direction === 'desc' ? '-' : ''}${sortField}`,
          ...(sortField === 'name' ? [] : ['name']),
        ]
      : undefined,
    limit: ITEM_PAGE_SIZE,
    offset,
  }
}

export async function fetchItemPage(
  filters: ItemListFilters,
  searchQuery: string,
  includesSetBonuses: boolean,
  offset = 0,
  sort: ItemListSort | null = null,
): Promise<ItemPage> {
  const page = await fetchApiPage<ApiItemRow, 'items'>(
    '/v1/items',
    'items',
    itemListParameters(filters, searchQuery, includesSetBonuses, offset, sort),
  )
  return { total: page.total, items: page.rows.map((row, index) => toItemSummary(row, index)) }
}

export async function fetchItem(id: number): Promise<Item> {
  const path = `/v1/items/${id}`
  const response = await fetchValidatedApiJson<ApiItemDetail>(
    path,
    undefined,
    (value): value is ApiItemDetail =>
      value !== null &&
      typeof value === 'object' &&
      'effects' in value &&
      isApiEffectList(value.effects),
    `Invalid response for ${path}: effects`,
  )
  return toItem(response, path)
}

export async function fetchAdventurePackNames(): Promise<string[]> {
  const page = await fetchApiPage<ApiAdventurePack, 'adventure_packs'>(
    '/v1/adventure-packs',
    'adventure_packs',
    { limit: WHOLE_LIST_PAGE_LIMIT },
  )
  return page.rows.map((pack, index) => {
    assertApiResponseFields(
      pack,
      '/v1/adventure-packs',
      { name: 'string' },
      `adventure_packs[${index}].`,
    )
    return pack.name
  })
}

export async function fetchEquipmentSlotNames(): Promise<string[]> {
  const page = await fetchApiPage<ApiEquipmentSlot, 'equipment_slots'>(
    '/v1/equipment-slots',
    'equipment_slots',
    { limit: WHOLE_LIST_PAGE_LIMIT },
  )
  return page.rows.map((slot, index) => {
    assertApiResponseFields(
      slot,
      '/v1/equipment-slots',
      { name: 'string' },
      `equipment_slots[${index}].`,
    )
    return slot.name
  })
}

export async function fetchEffectVocabulary(
  searchQuery = '',
): Promise<{ rows: ApiEffectVocabularyRow[]; total: number }> {
  const page = await fetchApiPage<ApiEffectVocabularyRow, 'effects'>(
    '/v1/effects',
    'effects',
    {
      q: searchQuery.trim() || undefined,
      limit: WHOLE_LIST_PAGE_LIMIT,
    },
    {
      isValidPage: (page) => page.rows.every(isApiEffectVocabularyRow),
      responseErrorMessage: 'Invalid effect vocabulary rows for /v1/effects',
    },
  )
  return { rows: page.rows, total: page.total }
}

export async function fetchEffectDetail(detailPath: string): Promise<ApiEffectDetail> {
  if (!/^\/v1\/effects\/\d+$/.test(detailPath)) {
    throw new ApiError(API_RESPONSE_ERROR, 0, `Invalid effect detail path: ${detailPath}`)
  }
  return fetchValidatedApiJson(
    detailPath,
    { items_limit: 0, augments_limit: 0, set_tiers_limit: 0 },
    isApiEffectDetail,
    `Invalid effect detail for ${detailPath}`,
  )
}

export async function fetchAugmentsFittingSlot(slotLabel: string): Promise<AugmentSummary[]> {
  const page = await fetchApiPage<ApiAugment, 'augments'>('/v1/augments', 'augments', {
    slot: slotLabel,
    limit: WHOLE_LIST_PAGE_LIMIT,
  })
  return page.rows.map(toAugmentSummary).sort((a, b) => {
    if (a.minimumLevel === null && b.minimumLevel !== null) return 1
    if (b.minimumLevel === null && a.minimumLevel !== null) return -1
    if (a.minimumLevel !== b.minimumLevel) return (a.minimumLevel ?? 0) - (b.minimumLevel ?? 0)
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

export async function fetchAugment(augmentId: number): Promise<AugmentDetail> {
  const path = `/v1/augments/${augmentId}`
  const response = await fetchValidatedApiJson<ApiAugmentDetail>(
    path,
    undefined,
    (value): value is ApiAugmentDetail =>
      value !== null &&
      typeof value === 'object' &&
      'effects' in value &&
      isApiEffectList(value.effects),
    `Invalid response for ${path}: effects`,
  )
  return toAugmentDetail(response)
}

export async function fetchRaidQuests(): Promise<RaidQuest[]> {
  const page = await fetchApiPage<ApiQuestSummary, 'quests'>('/v1/quests', 'quests', {
    limit: WHOLE_LIST_PAGE_LIMIT,
  })
  return page.rows
    .filter((quest, index) => {
      assertApiResponseFields(
        quest,
        '/v1/quests',
        { id: 'number', name: 'string', is_raid: 'boolean', pack: 'nullable-string' },
        `quests[${index}].`,
      )
      return quest.is_raid
    })
    .map((quest) => ({ id: quest.id, name: quest.name, pack: quest.pack }))
}
