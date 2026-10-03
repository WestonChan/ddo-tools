export type ApiQueryParameters = Record<
  string,
  string | number | boolean | readonly string[] | undefined
>

export type ApiPage<T, K extends string> = {
  total: number
  limit: number
  offset: number
} & Record<K, T[]>

export interface ApiItemRow {
  id: number
  name: string
  slot: string
  category: string
  item_type: string | null
  minimum_level: number | null
  enhancement_bonus: number | null
  icon: string | null
  pack: string | null
  is_raid: boolean
  is_rare: boolean
  is_legacy: boolean
}

export interface ApiBonus {
  id: number
  name: string
  description: string | null
  stat: string
  stat_category: string
  bonus_type: string | null
  value: number | null
  value2: number | null
}

export interface ApiModifier {
  id: number
  effect_type: string
  display_name: string | null
  bonus_type: string | null
  amounts: number[] | null
  value: string | null
  dice_number: number[] | null
  dice_sides: number[] | null
  dice_bonus: number[] | null
  dice_damage: string | null
  damage: string | null
  percent: boolean
  cap: string | null
}

export interface ApiItemEffect {
  id: number
  name: string
  description: string | null
  value: number | null
  target: string | null
}

export interface ApiAugmentSlotOption {
  name: string
  description: string | null
  min_level: number | null
}

export interface ApiItemAugmentSlot {
  sort_order: number
  slot_type_id: number
  label: string
  family: string
  variant: string
  qualifier: string | null
  options: ApiAugmentSlotOption[]
}

export interface ApiItemClickie {
  name: string
  clickie_id: number | null
  spell_id: number | null
  description: string | null
  icon: string | null
}

export interface ApiLootQuest {
  id: number
  name: string
  level: number | null
  epic_level: number | null
  is_raid: boolean
  pack: string | null
  patron: string | null
  loot_type: string | null
  is_rare: boolean
  is_free_to_play: boolean
  difficulties: string[]
  chest: string | null
}

export interface ApiItemQuestChain {
  id: number
  name: string
  is_rare: boolean
  wiki_url: string | null
}

export interface ApiItemSaga {
  id: number
  name: string
  tier: string | null
  is_rare: boolean
  wiki_url: string | null
}

export interface ApiItemAdventurePack {
  id: number
  name: string
  loot_type: string | null
  chest: string | null
  is_rare: boolean
  wiki_url?: string | null
}

export interface ApiItemCraftingSystem {
  id: number
  name: string
  is_rare: boolean
  wiki_url: string | null
}

export interface ApiItemChallengePack {
  id: number
  name: string
  is_rare: boolean
  wiki_url: string | null
}

export interface ApiItemVendor {
  id: number
  name: string
  location: string | null
  cost: string | null
  is_rare: boolean
  wiki_url: string | null
}

export interface ApiItemEvent {
  id: number
  name: string
  is_rare: boolean
  wiki_url: string | null
}

export interface ApiItemStarterReward {
  character_level: number
}

export type ApiItemSourceKind =
  | 'quest'
  | 'quest_chain'
  | 'saga'
  | 'adventure_pack'
  | 'challenge'
  | 'crafting_system'
  | 'vendor'
  | 'event'
  | 'starter'

export interface ApiItemSource {
  kind: ApiItemSourceKind
  id: number | null
  name: string
  loot_type: string | null
  chest: string | null
  is_rare: boolean
  tier: string | null
  character_level: number | null
  cost: string | null
  wiki_url: string | null
}

export interface ApiWeaponStats {
  weapon_type: string
  proficiency: string | null
  handedness: string | null
  damage: string | null
  critical: string | null
  base_dice_count: number | null
  base_dice_sides: number | null
  base_dice_bonus: number | null
  damage_multiplier: number | null
  critical_threat_range: number | null
  critical_multiplier: number | null
  attack_modifier: string | null
  damage_modifier: string | null
  dr_bypass: string[]
}

export interface ApiArmorStats {
  armor_type: string
  armor_bonus: number | null
  max_dex_bonus: number | null
  arcane_spell_failure: number | null
  armor_check_penalty: number | null
  shield_bonus: number | null
  damage_reduction: number | null
  mithral_body: number | null
  adamantine_body: number | null
}

export interface ApiItemDetail {
  id: number
  name: string
  slot: string
  category: string
  item_type: string | null
  minimum_level: number | null
  enhancement_bonus: number | null
  material: string | null
  race_required: string | null
  icon: string | null
  description: string | null
  drop_location: string | null
  set_name: string | null
  accepts_sentience: boolean
  is_minor_artifact: boolean
  wiki_url: string | null
  is_legacy: boolean
  weapon: ApiWeaponStats | null
  armor: ApiArmorStats | null
  bonuses: ApiBonus[]
  modifiers: ApiModifier[]
  effects: ApiItemEffect[]
  augment_slots: ApiItemAugmentSlot[]
  clickies: ApiItemClickie[]
  set: { id: number; name: string; icon: string | null } | null
  quests: ApiLootQuest[]
  quest_chains: ApiItemQuestChain[]
  sagas: ApiItemSaga[]
  adventure_packs: ApiItemAdventurePack[]
  crafting_systems: ApiItemCraftingSystem[]
  challenge_packs: ApiItemChallengePack[]
  vendors: ApiItemVendor[]
  events: ApiItemEvent[]
  starter_rewards: ApiItemStarterReward[]
  sources: ApiItemSource[]
}

export interface ApiAugment {
  id: number
  name: string
  family: string
  description: string | null
  min_level: number | null
  icon: string | null
  slots: string[]
  bonuses: ApiBonus[]
  crafting: ApiCraftingRecipe[]
}

export interface ApiAugmentDetail extends ApiAugment {
  quests: ApiLootQuest[]
  modifiers: ApiModifier[]
  effect_description: string | null
}

export type ApiCraftingTier = 'heroic' | 'epic' | 'legendary' | 'any'

export interface ApiCraftingIngredientCost {
  ingredient: string
  tier: string
  quantity: number
}

export interface ApiCraftingRecipe {
  system: string
  tier: ApiCraftingTier
  option: string
  cost: ApiCraftingIngredientCost[]
}

export interface ApiAdventurePack {
  id: number
  name: string
  is_free_to_play: boolean
}

export interface ApiSourceItem {
  id: number
  name: string
  slot: string
}

export interface ApiSourceQuest {
  id: number
  name: string
  level: number | null
}

export interface ApiAdventurePackDetail {
  id: number
  name: string
  is_free_to_play: boolean
  items: ApiSourceItem[]
}

export interface ApiQuestSeriesDetail {
  id: number
  name: string
  pack: string | null
  quests: ApiSourceQuest[]
  rewards: ApiSourceItem[]
}

export interface ApiCraftingSystemDetail {
  id: number
  name: string
  pack: string | null
  npc: string | null
  ingredient_count: number
  recipes: Array<{ option: string; augments: Array<{ name: string }> }>
}

export interface ApiVendorDetail {
  id: number
  name: string
  pack: string | null
  location: string | null
  items: ApiSourceItem[]
}

export interface ApiEventDetail {
  id: number
  name: string
  items: ApiSourceItem[]
}

export interface ApiEquipmentSlot {
  id: number
  name: string
  sort_order: number
  category: string
}

export interface ApiEnchantment {
  name: string
  kind: 'stat' | 'effect'
  item_count: number
}

export interface ApiQuestSummary {
  id: number
  name: string
  pack: string | null
  is_raid: boolean
}

export interface ApiSetModifier {
  effect_type: string
  extra_types?: string[] | null
  display_name: string | null
  bonus: string | null
  bonus_type: string | null
  amounts: number[]
  targets: string[] | null
  value: number | null
}

export interface ApiSetDetail {
  id: number
  name: string
  tiers: Array<{
    equipped_count: number
    description: string | null
    bonuses?: ApiBonus[]
    modifiers: ApiSetModifier[]
  }>
  items: Array<{ id: number; name: string; slot: string; minimum_level: number | null }>
}

export interface ApiQuestDetail {
  id: number
  name: string
  pack: string | null
  is_raid: boolean
  items: Array<{
    id: number
    name: string
    slot: string
    minimum_level: number | null
    loot_type: string
    is_rare: boolean
    chest: string | null
  }>
}
