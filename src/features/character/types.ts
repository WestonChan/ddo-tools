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

export type PastLifeCategory = ReincarnationType
