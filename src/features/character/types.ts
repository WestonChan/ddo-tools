export interface Race {
  id: string
  name: string
  statModifiers: Record<string, number>
}

export interface CharacterClass {
  id: string
  name: string
  hitDie: number
}

export interface Feat {
  id: string
  name: string
  description: string
  prerequisites: string[]
}

export interface Enhancement {
  id: string
  name: string
  treeName: string
  tier: number
  cost: number
  description: string
}

export type AbilityScore = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'

export interface CharacterStats {
  abilityScores: Record<AbilityScore, number>
  hp: number
  sp: number
  bab: number
  fortification: number
  ac: number
  prr: number
  mrr: number
  dodge: number
  saves: { fortitude: number; reflex: number; will: number }
  meleePower: number
  rangedPower: number
  spellPower: number
}

// --- Reincarnation & Character model ---

export type ReincarnationType = 'heroic' | 'racial' | 'iconic' | 'epic'
export type EpicSphere = 'arcane' | 'divine' | 'martial' | 'primal'
export type Server = 'Cormyr' | 'Moonsea' | 'Shadowdale' | 'Thrane' | 'Hardcore'
export type LifeStatus = 'completed' | 'current' | 'planned'

/** How a life ended — the reincarnation event that completed it */
export interface Reincarnation {
  type: ReincarnationType
  epicFeatId?: string // specific epic past life feat chosen (only when type === 'epic')
  completedAt?: string // ISO date
}

/** Tracks provenance of imported lives, preserving original data for future mapping */
export type ImportFormat = 'ddo-builder-v2'
export interface ImportSource {
  format: ImportFormat
  filename: string
  importedAt: string // ISO date
  rawData?: string // original XML preserved for unmapped fields
}

/** A single life (build) within a character's reincarnation history */
export interface Life {
  id: string
  name: string
  race: string
  classes: { classId: string; levels: number }[]
  feats: string[]
  enhancements: string[]
  status: LifeStatus
  reincarnation?: Reincarnation // how this life ended (only for completed lives)
  importSource?: ImportSource // only for imported lives
  notes?: string
  desiredPastLives?: PastLifeCounts // only meaningful for planned builds
}

/** Past life stacks by category — used for both untracked lives and desired build targets */
export interface PastLifeCounts {
  heroic: Record<string, number>
  racial: Record<string, number>
  iconic: Record<string, number>
  epic: Record<string, number>
}

/** A character is a container of ordered lives with past life tracking */
export interface Character {
  id: string
  name: string
  server?: Server
  notes?: string
  lives: Life[]
  currentLifeIndex: number
  untrackedLives: PastLifeCounts
  createdAt: string
  updatedAt: string
}

/** App-level settings stored in localStorage */
export interface AppSettings {
  defaultServer?: Server
}

// --- Past life reference data (loaded from JSON) ---

/** All categories that grant past life stacks (same as ReincarnationType) */
export type PastLifeCategory = ReincarnationType

export interface PastLifeBonus {
  stat: string
  value: number
  description: string
}

export interface PastLifeFeat {
  id: string
  name: string
  description: string
  category: PastLifeCategory
  sourceId: string
  maxStacks: number
  bonusPerStack: PastLifeBonus[]
}

// --- Derived past life summary (computed, not stored) ---

export interface PastLifeStack {
  pastLifeFeatId: string
  category: PastLifeCategory
  sourceId: string
  stacks: number
  fromLives: number
  fromOverride: number
}

export interface PastLifeSummary {
  heroic: PastLifeStack[]
  racial: PastLifeStack[]
  iconic: PastLifeStack[]
  epic: PastLifeStack[]
  totalPastLives: number
}
