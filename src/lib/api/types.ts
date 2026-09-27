
export interface ApiDatasetVersion {
  upstream_sha: string
  built_at: string
}

export interface ApiVersion {
  schema_version: number
  dataset: ApiDatasetVersion
  counts: Record<string, number>
}

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
}

export interface ApiItemsPage {
  total: number
  limit: number
  offset: number
  items: ApiItemRow[]
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

export interface ApiItemQuest {
  id: number
  name: string
  level: number | null
  epic_level: number | null
  is_raid: boolean
  pack: string | null
  patron: string | null
  loot_type: string | null
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
  weapon: ApiWeaponStats | null
  armor: ApiArmorStats | null
  bonuses: ApiBonus[]
  effects: ApiItemEffect[]
  augment_slots: ApiItemAugmentSlot[]
  clickies: ApiItemClickie[]
  set: { id: number; name: string; icon: string | null } | null
  quests: ApiItemQuest[]
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
}

export interface ApiAugmentsPage {
  total: number
  limit: number
  offset: number
  augments: ApiAugment[]
}

export interface ApiStat {
  id: number
  name: string
  category: string
}

export interface ApiAdventurePack {
  id: number
  name: string
  is_free_to_play: boolean
}
