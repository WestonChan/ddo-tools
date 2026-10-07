import type { ComponentType, ReactNode } from 'react'

export type DetailCardVariant = 'pane' | 'hover'

export interface DetailCardFact {
  label: string
  value?: ReactNode
}

export interface DetailCardDefinition {
  kicker: string
  name: ReactNode
  titleId?: string
  badges?: ReactNode
  facts: readonly DetailCardFact[]
  sections: readonly DetailCardSectionContent[]
  paneActions?: ReactNode
  paneFooter?: ReactNode
  cardFooter?: ReactNode
  afterHeader?: ReactNode
}

export interface DetailCardSectionDefinition<Entry> {
  key: string
  heading?: string
  entries: readonly Entry[]
  FullView: ComponentType<{ entries: readonly Entry[] }>
  BriefView?: ComponentType<{ entries: readonly Entry[] }>
  briefEntryLimit?: number
}

export interface DetailCardSectionContent {
  key: string
  heading?: string
  entries: readonly unknown[]
  FullView: ComponentType<{ entries: readonly unknown[] }>
  BriefView?: ComponentType<{ entries: readonly unknown[] }>
  briefEntryLimit?: number
}

export function detailCardSection<Entry>({
  key,
  heading,
  entries,
  FullView,
  BriefView,
  briefEntryLimit,
}: DetailCardSectionDefinition<Entry>): DetailCardSectionContent {
  return {
    key,
    heading,
    entries,
    FullView: FullView as ComponentType<{ entries: readonly unknown[] }>,
    BriefView: BriefView as ComponentType<{ entries: readonly unknown[] }> | undefined,
    briefEntryLimit,
  }
}
