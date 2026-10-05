import {
  assertApiResponseFields,
  fetchApiJson,
  type ApiSetDetail,
  type ApiSetModifier,
} from '../../../lib/api'

export interface SetBonus {
  key: string
  name: string
  type: string | null
  value: number | null
  description: string | null
}

export interface SetTier {
  equippedCount: number
  description: string | null
  bonuses: SetBonus[]
}

export interface SetDetail {
  id: number
  name: string
  tiers: SetTier[]
  items: Array<{ id: number; name: string; slot: string; minimumLevel: number | null }>
}

const EFFECT_TYPE_LABELS: Record<string, string> = {
  PRR: 'Physical Resistance Rating',
  MRR: 'Magical Resistance Rating',
}

function wordsInEffectType(effectType: string): string {
  return EFFECT_TYPE_LABELS[effectType] ?? effectType.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function modifierName(modifier: ApiSetModifier, effectType: string): string {
  if (modifier.display_name && effectType === modifier.effect_type) return modifier.display_name
  const effectName = wordsInEffectType(effectType)
  const targets = modifier.targets?.filter((target) => target !== 'All') ?? []
  return targets.length ? `${targets.join(', ')} ${effectName}` : effectName
}

function modifierIsRepresented(
  modifier: ApiSetModifier,
  effectType: string,
  bonuses: NonNullable<ApiSetDetail['tiers'][number]['bonuses']>,
): boolean {
  const modifierValue = modifier.amounts[0] ?? modifier.value
  const effectName = wordsInEffectType(effectType)
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return bonuses.some((bonus) => {
    if (bonus.value !== modifierValue || bonus.bonus_type !== modifier.bonus_type) return false
    const statName = bonus.stat.toLowerCase()
    const normalizedStat = statName.replace(/[^a-z]/g, '')
    const statInitials = bonus.stat
      .match(/\b[A-Z]/g)
      ?.join('')
      .toLowerCase()
    const isSameStat =
      normalizedStat === effectName ||
      statInitials === effectName ||
      (effectName === 'spellpower' && statName.includes('spell power'))
    if (!isSameStat) return false
    const targets = modifier.targets?.filter((target) => target !== 'All') ?? []
    return targets.every((target) => statName.includes(target.toLowerCase()))
  })
}

export function toSetDetail(
  apiSet: ApiSetDetail,
  path = `/v1/sets/${apiSet?.id ?? 'unknown'}`,
): SetDetail {
  assertApiResponseFields(apiSet, path, {
    id: 'number',
    name: 'string',
    items: 'array',
    tiers: 'array',
  })
  apiSet.tiers.forEach((tier, index) => {
    assertApiResponseFields(tier, path, { modifiers: 'array' }, `tiers[${index}].`)
  })
  return {
    id: apiSet.id,
    name: apiSet.name,
    items: apiSet.items.map((item) => ({
      id: item.id,
      name: item.name,
      slot: item.slot,
      minimumLevel: item.minimum_level,
    })),
    tiers: apiSet.tiers.map((tier) => {
      const bonuses = tier.bonuses ?? []
      return {
        equippedCount: tier.equipped_count,
        description: tier.description,
        bonuses: [
          ...bonuses.map((bonus) => ({
            key: `bonus-${bonus.id}`,
            name: bonus.stat,
            type: bonus.bonus_type,
            value: bonus.value,
            description: bonus.description,
          })),
          ...tier.modifiers.flatMap((modifier, index) =>
            [modifier.effect_type, ...(modifier.extra_types ?? [])]
              .filter((effectType) => !modifierIsRepresented(modifier, effectType, bonuses))
              .map((effectType) => ({
                key: `modifier-${index}-${effectType}`,
                name: modifierName(modifier, effectType),
                type: modifier.bonus_type,
                value: modifier.amounts[0] ?? modifier.value,
                description: null,
              })),
          ),
        ],
      }
    }),
  }
}

export async function fetchSet(id: number): Promise<SetDetail> {
  const path = `/v1/sets/${id}`
  return toSetDetail(await fetchApiJson<ApiSetDetail>(path), path)
}
