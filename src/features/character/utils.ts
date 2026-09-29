import type { Character, EpicSphere, Life, PastLifeCounts } from './types'
import { PAST_LIFE_DEFINITIONS } from './data/pastLifeDefinitions'

export const PAST_LIFE_CATEGORIES = ['heroic', 'racial', 'iconic', 'epic'] as const

export const EPIC_SPHERES: { id: EpicSphere; label: string }[] = [
  { id: 'arcane', label: 'Arcane' },
  { id: 'divine', label: 'Divine' },
  { id: 'martial', label: 'Martial' },
  { id: 'primal', label: 'Primal' },
]

export const EMPTY_PAST_LIFE_COUNTS: PastLifeCounts = {
  heroic: {},
  racial: {},
  iconic: {},
  epic: {},
}

export function withStackCount(
  stackCounts: Record<string, number>,
  pastLifeId: string,
  stackCount: number,
): Record<string, number> {
  const copy = { ...stackCounts }
  if (stackCount <= 0) delete copy[pastLifeId]
  else copy[pastLifeId] = stackCount
  return copy
}

export function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function titleCased(kebabCaseId: string): string {
  return kebabCaseId
    .split('-')
    .map((w) => capitalized(w))
    .join(' ')
}

export function raceLabelOf(raceId: string): string {
  return titleCased(raceId)
}

export function classSplitLabel(life: Life): string {
  return life.classes.map((c) => `${c.levels} ${titleCased(c.classId)}`).join(' / ')
}

export function totalStackCountOf(pastLifeCounts: PastLifeCounts): number {
  let count = 0
  for (const category of PAST_LIFE_CATEGORIES) {
    for (const value of Object.values(pastLifeCounts[category])) {
      count += value
    }
  }
  return count
}

export function missingPastLifeWarnings(
  desiredPastLives: PastLifeCounts | undefined,
  character: Character,
): string[] {
  if (!desiredPastLives) return []
  const historyStackCounts = stackCountsEarnedBy(character.lives)
  const untrackedLives = character.untrackedLives
  const warnings: string[] = []

  for (const category of PAST_LIFE_CATEGORIES) {
    const desiredStackCounts = desiredPastLives[category]
    const untrackedStackCounts = untrackedLives[category]
    for (const [pastLifeId, desiredStackCount] of Object.entries(desiredStackCounts)) {
      const historyStackCount = historyStackCounts[pastLifeId] ?? 0
      const untrackedStackCount = untrackedStackCounts[pastLifeId] ?? 0
      const pastLife = PAST_LIFE_DEFINITIONS.find((d) => d.id === pastLifeId)
      const ownedStackCount = Math.min(
        historyStackCount + untrackedStackCount,
        pastLife?.maximumStackCount ?? 3,
      )
      if (desiredStackCount > ownedStackCount) {
        const name = pastLife?.name ?? capitalized(pastLifeId)
        warnings.push(`${desiredStackCount - ownedStackCount}× ${name} (${category})`)
      }
    }
  }

  return warnings
}

export function summedBonusText(bonusTexts: string[]): string {
  if (bonusTexts.length === 0) return ''
  const totalBySuffix = new Map<string, number>()
  const unsummableSegments: string[] = []
  for (const bonusText of bonusTexts) {
    for (const segment of bonusText.split(', ')) {
      const m = segment.match(/^([+-]\d+)(.+)$/)
      if (m) totalBySuffix.set(m[2], (totalBySuffix.get(m[2]) ?? 0) + parseInt(m[1]))
      else unsummableSegments.push(segment)
    }
  }
  const summedSegments = [...totalBySuffix.entries()].map(
    ([suffix, total]) => `${total >= 0 ? '+' : ''}${total}${suffix}`,
  )
  return [...summedSegments, ...unsummableSegments].join(', ')
}

export function lifeNumbersOf(character: Character): Map<string, number> {
  const untrackedLifeCount = totalStackCountOf(character.untrackedLives)
  const numbersByLifeId = new Map<string, number>()
  let lifeNumber = untrackedLifeCount + 1

  for (const life of character.lives) {
    numbersByLifeId.set(life.id, lifeNumber)
    if (life.reincarnation) {
      lifeNumber++
    }
  }

  return numbersByLifeId
}

export function currentLifeNumberOf(character: Character): number {
  const lifeNumbersByLifeId = lifeNumbersOf(character)
  const currentLife = character.lives[character.currentLifeIndex]
  return currentLife ? (lifeNumbersByLifeId.get(currentLife.id) ?? 1) : 1
}

export function desiredPastLifeCountOf(plannedBuild: Life): number {
  if (!plannedBuild.desiredPastLives) return 0
  return totalStackCountOf(plannedBuild.desiredPastLives)
}

export function stackCountsEarnedBy(lives: Life[]): Record<string, number> {
  const stackCounts: Record<string, number> = {}
  for (const life of lives) {
    if (life.status !== 'completed' || !life.reincarnation) continue
    const reincarnation = life.reincarnation
    if (reincarnation.type === 'epic') {
      if (!reincarnation.epicFeatId) continue
      stackCounts[reincarnation.epicFeatId] = (stackCounts[reincarnation.epicFeatId] ?? 0) + 1
    } else if (reincarnation.type === 'heroic') {
      const majorityClass = life.classes.reduce((a, b) => (b.levels > a.levels ? b : a))
      stackCounts[majorityClass.classId] = (stackCounts[majorityClass.classId] ?? 0) + 1
    } else if (reincarnation.type === 'racial') {
      stackCounts[life.race] = (stackCounts[life.race] ?? 0) + 1
    } else if (reincarnation.type === 'iconic') {
      stackCounts[life.race] = (stackCounts[life.race] ?? 0) + 1
    }
  }
  return stackCounts
}
