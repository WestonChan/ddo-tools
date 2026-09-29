import { activeCharacterSummaryOf, type ActiveCharacterSummary } from '../activeCharacterSummary'
import { useCharacters } from './useCharacters'

export function useActiveCharacterSummary(): ActiveCharacterSummary | null {
  return activeCharacterSummaryOf(useCharacters())
}
