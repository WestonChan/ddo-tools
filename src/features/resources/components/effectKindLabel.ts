import type { ApiEffectVocabularyRow } from '../../../lib/api'

export function effectKindLabel(kind: ApiEffectVocabularyRow['kind']): string {
  return kind === 'stat' ? 'Stat' : kind === 'group' ? 'Group' : 'Enchantment'
}
