import type {
  ApiEffect,
  ApiEffectDetail,
  ApiEffectVocabularyRow,
  ApiQueryParameters,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isApiEffectDamage(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.trigger === 'string' &&
    typeof value.damage_type === 'string' &&
    Number.isSafeInteger(value.dice_number) &&
    Number.isSafeInteger(value.dice_sides) &&
    Number.isSafeInteger(value.dice_bonus) &&
    Number.isSafeInteger(value.amount_from) &&
    Number.isFinite(value.scale)
  )
}

function isApiEffectBonus(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.stat === 'string' &&
    typeof value.stat_category === 'string' &&
    typeof value.bonus_type === 'string' &&
    Number.isSafeInteger(value.value) &&
    (value.amount_source === 'owner' ||
      value.amount_source === 'default' ||
      value.amount_source === 'constant') &&
    Number.isFinite(value.scale) &&
    (value.group == null ||
      (isRecord(value.group) &&
        Number.isSafeInteger(value.group.id) &&
        typeof value.group.name === 'string'))
  )
}

export function isApiEffect(value: unknown): value is ApiEffect {
  if (!isRecord(value)) return false
  return (
    Number.isSafeInteger(value.effect_id) &&
    typeof value.name === 'string' &&
    typeof value.verbose_name === 'string' &&
    (value.description == null || typeof value.description === 'string') &&
    (value.value == null || Number.isSafeInteger(value.value)) &&
    (value.value2 == null || Number.isSafeInteger(value.value2)) &&
    (value.bonus_type == null || typeof value.bonus_type === 'string') &&
    (value.tier == null ||
      (isRecord(value.tier) &&
        typeof value.tier.group === 'string' &&
        Number.isSafeInteger(value.tier.rank))) &&
    Array.isArray(value.bonuses) &&
    value.bonuses.every(isApiEffectBonus) &&
    Array.isArray(value.damage) &&
    value.damage.every(isApiEffectDamage)
  )
}

export function isApiEffectList(value: unknown): value is ApiEffect[] {
  return Array.isArray(value) && value.every(isApiEffect)
}

export function isApiEffectVocabularyRow(value: unknown): value is ApiEffectVocabularyRow {
  if (!isRecord(value)) return false
  return (
    Number.isSafeInteger(value.id) &&
    typeof value.name === 'string' &&
    (value.kind === 'effect' || value.kind === 'stat' || value.kind === 'group') &&
    typeof value.detail_path === 'string' &&
    value.detail_path === `/v1/effects/${value.id}` &&
    Number.isSafeInteger(value.item_count) &&
    Number.isSafeInteger(value.augment_count) &&
    Number.isSafeInteger(value.set_count) &&
    Array.isArray(value.bonus_types) &&
    value.bonus_types.every(
      (bonusType: unknown) =>
        isRecord(bonusType) &&
        typeof bonusType.name === 'string' &&
        Number.isSafeInteger(bonusType.item_count),
    )
  )
}

function isEffectCarrier(value: unknown, isSetTier: boolean): boolean {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.id) &&
    typeof value.name === 'string' &&
    isApiEffect(value.line) &&
    (value.amount_source == null || typeof value.amount_source === 'string') &&
    (value.bonus_type == null || typeof value.bonus_type === 'string') &&
    (value.effect == null || typeof value.effect === 'string') &&
    (value.effect_id == null || Number.isSafeInteger(value.effect_id)) &&
    (value.scale == null || Number.isFinite(value.scale)) &&
    (value.value == null || Number.isSafeInteger(value.value)) &&
    (value.value2 == null || Number.isSafeInteger(value.value2)) &&
    (value.bonuses == null ||
      (Array.isArray(value.bonuses) && value.bonuses.every(isApiEffectBonus))) &&
    (!isSetTier ||
      (Number.isSafeInteger(value.set_id) &&
        typeof value.set_name === 'string' &&
        Number.isSafeInteger(value.equipped_count)))
  )
}

function isEffectCarrierPage(value: unknown, key: string, isSetTier = false): boolean {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.total) &&
    Number.isSafeInteger(value.limit) &&
    Number.isSafeInteger(value.offset) &&
    Array.isArray(value[key]) &&
    value[key].every((carrier: unknown) => isEffectCarrier(carrier, isSetTier))
  )
}

function isTierStep(value: unknown): boolean {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.id) &&
    typeof value.name === 'string' &&
    Number.isSafeInteger(value.rank)
  )
}

export function isApiEffectDetail(value: unknown): value is ApiEffectDetail {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.id) &&
    typeof value.name === 'string' &&
    (value.kind === 'effect' || value.kind === 'stat' || value.kind === 'group') &&
    (value.category == null || typeof value.category === 'string') &&
    (value.verbose_name_template === null || typeof value.verbose_name_template === 'string') &&
    (value.description_template == null || typeof value.description_template === 'string') &&
    (value.wiki_url == null || typeof value.wiki_url === 'string') &&
    (value.default_value == null || Number.isSafeInteger(value.default_value)) &&
    (value.default_value2 == null || Number.isSafeInteger(value.default_value2)) &&
    (value.tier == null ||
      (isRecord(value.tier) &&
        typeof value.tier.group === 'string' &&
        Number.isSafeInteger(value.tier.rank) &&
        Array.isArray(value.tier.steps) &&
        value.tier.steps.every(isTierStep))) &&
    Array.isArray(value.bonuses) &&
    value.bonuses.every(
      (bonus: unknown) =>
        isRecord(bonus) &&
        typeof bonus.target === 'string' &&
        (bonus.target_kind === 'stat' || bonus.target_kind === 'group') &&
        Number.isSafeInteger(bonus.amount_from) &&
        (bonus.bonus_type == null || typeof bonus.bonus_type === 'string') &&
        (bonus.constant == null || Number.isSafeInteger(bonus.constant)) &&
        Number.isFinite(bonus.scale) &&
        typeof bonus.rounding === 'string',
    ) &&
    Array.isArray(value.damage) &&
    value.damage.every(isApiEffectDamage) &&
    isEffectCarrierPage(value.items, 'items') &&
    isEffectCarrierPage(value.augments, 'augments') &&
    isEffectCarrierPage(value.set_tiers, 'set_tiers', true)
  )
}

export type MultiValueFilterName =
  'bonus' | 'slot' | 'set' | 'pack' | 'quest' | 'quest_chain' | 'saga'

export function multiValueFilterParameters(
  name: MultiValueFilterName,
  values: readonly string[],
  match: 'any' | 'all' = 'any',
): ApiQueryParameters {
  return values.length
    ? { [name]: values, [`${name}_match`]: match === 'all' ? 'all' : undefined }
    : {}
}

export function statBonusFilterValue(statName: string, bonusType?: string): string {
  return bonusType ? `${statName}:${bonusType}` : statName
}
