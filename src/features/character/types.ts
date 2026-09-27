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


export type ReincarnationType = 'heroic' | 'racial' | 'iconic' | 'epic'
export type EpicSphere = 'arcane' | 'divine' | 'martial' | 'primal'
export type Server = 'Cormyr' | 'Moonsea' | 'Shadowdale' | 'Thrane' | 'Hardcore'
export type LifeStatus = 'completed' | 'current' | 'planned'

export interface Reincarnation {
  type: ReincarnationType
  epicFeatId?: string
  completedAt?: string
}

export type ImportFormat = 'ddo-builder-v2'
export interface ImportSource {
  format: ImportFormat
  filename: string
  importedAt: string
  rawData?: string
}

export interface Life {
  id: string
  name: string
  race: string
  classes: { classId: string; levels: number }[]
  feats: string[]
  enhancements: string[]
  status: LifeStatus
  reincarnation?: Reincarnation
  importSource?: ImportSource
  notes?: string
  desiredPastLives?: PastLifeCounts
}

export interface PastLifeCounts {
  heroic: Record<string, number>
  racial: Record<string, number>
  iconic: Record<string, number>
  epic: Record<string, number>
}

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

export interface AppSettings {
  defaultServer?: Server
}


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
