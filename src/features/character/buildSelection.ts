import type { BuildSelection } from './migrations'

export function buildSelectionViewing(
  previous: BuildSelection,
  characterId: string | null,
  buildId: string,
): BuildSelection {
  return {
    characterId: characterId ?? previous.characterId,
    buildId,
    comparisonBuildId: previous.comparisonBuildId === buildId ? null : previous.comparisonBuildId,
  }
}

export function buildSelectionWithoutPlannedBuild(
  previous: BuildSelection,
  deletedBuildId: string,
  fallbackBuildId: string,
): BuildSelection {
  const selectionWithoutComparison =
    previous.comparisonBuildId === deletedBuildId
      ? { ...previous, comparisonBuildId: null }
      : previous
  if (previous.buildId !== deletedBuildId) return selectionWithoutComparison
  return buildSelectionViewing(selectionWithoutComparison, null, fallbackBuildId)
}
