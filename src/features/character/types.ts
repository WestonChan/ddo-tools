export interface Race {
  id: string
  name: string
  modifierByAbility: Record<string, number>
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
  actionPointCost: number
  description: string
}

export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'

export interface CharacterStats {
  abilityScores: Record<Ability, number>
  hitPoints: number
  spellPoints: number
  baseAttackBonus: number
  fortificationPercent: number
  armorClass: number
  physicalResistanceRating: number
  magicalResistanceRating: number
  dodgePercent: number
  saves: { fortitude: number; reflex: number; will: number }
  meleePower: number
  rangedPower: number
  spellPower: number
}

export type ReincarnationType = 'heroic' | 'racial' | 'iconic' | 'epic'
export type EpicSphere = 'arcane' | 'divine' | 'martial' | 'primal'
export type GameServer = 'Cormyr' | 'Moonsea' | 'Shadowdale' | 'Thrane' | 'Hardcore'
export type LifeStatus = 'completed' | 'current' | 'planned'

export interface Reincarnation {
  type: ReincarnationType
  epicFeatId?: string
  completedAt?: string
}

export type ImportFormat = 'ddo-builder-v2'
export interface ImportedBuildFile {
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
  importSource?: ImportedBuildFile
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
  server?: GameServer
  notes?: string
  lives: Life[]
  currentLifeIndex: number
  untrackedLives: PastLifeCounts
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  defaultServer?: GameServer
}

export type PastLifeCategory = ReincarnationType

export interface PastLifeBonus {
  stat: string
  amount: number
  description: string
}

export interface PastLifeFeat {
  id: string
  name: string
  description: string
  category: PastLifeCategory
  sourceId: string
  maximumStackCount: number
  bonusesPerStack: PastLifeBonus[]
}

export interface PastLifeStack {
  pastLifeFeatId: string
  category: PastLifeCategory
  sourceId: string
  stackCount: number
  historyStackCount: number
  untrackedStackCount: number
}

export interface PastLifeSummary {
  heroic: PastLifeStack[]
  racial: PastLifeStack[]
  iconic: PastLifeStack[]
  epic: PastLifeStack[]
  totalPastLifeCount: number
}
