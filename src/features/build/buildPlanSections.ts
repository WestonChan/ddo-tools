import { GitBranch, ListOrdered, Orbit, Skull, Sparkles, TableProperties } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type BuildPlanSectionId =
  | 'levels'
  | 'skills'
  | 'spells'
  | 'enhancements'
  | 'destinies'
  | 'reaper'

export interface BuildPlanSection {
  id: BuildPlanSectionId
  label: string
  Icon: LucideIcon
}

export const BUILD_PLAN_SECTIONS: BuildPlanSection[] = [
  { id: 'levels', label: 'Levels', Icon: ListOrdered },
  { id: 'skills', label: 'Skills', Icon: TableProperties },
  { id: 'spells', label: 'Spells', Icon: Sparkles },
  { id: 'enhancements', label: 'Enhancements', Icon: GitBranch },
  { id: 'destinies', label: 'Destinies', Icon: Orbit },
  { id: 'reaper', label: 'Reaper', Icon: Skull },
]
