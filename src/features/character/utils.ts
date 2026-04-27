import type { Character, EpicSphere, Life, PastLifeCounts } from './types'
import { PAST_LIFE_DEFS } from './data/pastLifeDefs'

export const PAST_LIFE_CATEGORIES = ['heroic', 'racial', 'iconic', 'epic'] as const

export const EPIC_SPHERE_LIST: { sphere: EpicSphere; label: string }[] = [
  { sphere: 'arcane', label: 'Arcane' },
  { sphere: 'divine', label: 'Divine' },
  { sphere: 'martial', label: 'Martial' },
  { sphere: 'primal', label: 'Primal' },
]

export const EMPTY_UNTRACKED: PastLifeCounts = {
  heroic: {},
  racial: {},
  iconic: {},
  epic: {},
}

/** Update a single entry in a category map, deleting if value <= 0. */
export function updateCategoryMap(
  map: Record<string, number>,
  id: string,
  value: number,
): Record<string, number> {
  const copy = { ...map }
  if (value <= 0) delete copy[id]
  else copy[id] = value
  return copy
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Title-case a kebab-cased id: 'eladrin-chaosmancer' -> 'Eladrin Chaosmancer'. */
export function titleCase(s: string): string {
  return s
    .split('-')
    .map((w) => capitalize(w))
    .join(' ')
}

export function formatRace(race: string): string {
  return titleCase(race)
}

export function formatClassSummary(life: Life): string {
  return life.classes.map((c) => `${c.levels} ${titleCase(c.classId)}`).join(' / ')
}

/** Sum all stacks across all categories in an PastLifeCounts record. */
export function sumAllStacks(stacks: PastLifeCounts): number {
  let count = 0
  for (const category of PAST_LIFE_CATEGORIES) {
    for (const value of Object.values(stacks[category])) {
      count += value
    }
  }
  return count
}

/**
 * Compare a planned build's desired past lives against a character's actual stacks.
 * Returns human-readable warnings for each mismatch (build wants more than character has).
 */
export function computeMismatchWarnings(
  desired: PastLifeCounts | undefined,
  character: Character,
): string[] {
  if (!desired) return []
  const history = computeHistoryStacks(character.lives)
  const untracked = character.untrackedLives
  const warnings: string[] = []

  for (const category of PAST_LIFE_CATEGORIES) {
    const desiredCat = desired[category]
    const untrackedCat = untracked[category]
    for (const [id, wantCount] of Object.entries(desiredCat)) {
      const fromHistory = history[id] ?? 0
      const fromUntracked = untrackedCat[id] ?? 0
      const def = PAST_LIFE_DEFS.find((d) => d.id === id)
      const charHas = Math.min(fromHistory + fromUntracked, def?.max ?? 3)
      if (wantCount > charHas) {
        const name = def?.name ?? capitalize(id)
        warnings.push(`${wantCount - charHas}× ${name} (${category})`)
      }
    }
  }

  return warnings
}

/** Sum per-stack bonuses: ['+10 HP', '+10 HP'] → '+20 HP'. Groups by suffix and adds numbers. */
export function formatBonusList(parts: string[]): string {
  if (parts.length === 0) return ''
  const sums = new Map<string, number>()
  const unsummable: string[] = []
  for (const part of parts) {
    for (const seg of part.split(', ')) {
      const m = seg.match(/^([+-]\d+)(.+)$/)
      if (m) sums.set(m[2], (sums.get(m[2]) ?? 0) + parseInt(m[1]))
      else unsummable.push(seg)
    }
  }
  const summed = [...sums.entries()].map(
    ([suffix, total]) => `${total >= 0 ? '+' : ''}${total}${suffix}`,
  )
  return [...summed, ...unsummable].join(', ')
}

/** Map each life id to its life number (tracked history + untracked lives) */
export function computeLifeNumbers(character: Character): Map<string, number> {
  const offset = sumAllStacks(character.untrackedLives)
  const map = new Map<string, number>()
  let lifeNum = offset + 1

  for (const life of character.lives) {
    map.set(life.id, lifeNum)
    if (life.reincarnation) {
      lifeNum++
    }
  }

  return map
}

/** Get the current life number for a character */
export function getCurrentLifeNumber(character: Character): number {
  const numbers = computeLifeNumbers(character)
  const currentLife = character.lives[character.currentLifeIndex]
  return currentLife ? (numbers.get(currentLife.id) ?? 1) : 1
}

/** Count total desired past lives for a planned build (all categories including epic) */
export function getPlannedBuildPastLives(life: Life): number {
  if (!life.desiredPastLives) return 0
  return sumAllStacks(life.desiredPastLives)
}

/** Count past life stacks from completed lives in the history */
export function computeHistoryStacks(lives: Life[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const life of lives) {
    if (life.status !== 'completed' || !life.reincarnation) continue
    const r = life.reincarnation
    if (r.type === 'epic') {
      if (!r.epicFeatId) continue
      counts[r.epicFeatId] = (counts[r.epicFeatId] ?? 0) + 1
    } else if (r.type === 'heroic') {
      const majority = life.classes.reduce((a, b) => (b.levels > a.levels ? b : a))
      counts[majority.classId] = (counts[majority.classId] ?? 0) + 1
    } else if (r.type === 'racial') {
      counts[life.race] = (counts[life.race] ?? 0) + 1
    } else if (r.type === 'iconic') {
      counts[life.race] = (counts[life.race] ?? 0) + 1
    }
  }
  return counts
}
