import { useRef, type JSX, type ReactNode } from 'react'
import { PageSection, WireframePlaceholder } from '../../components'
import { BUILD_PLAN_SECTIONS, type BuildPlanSectionId } from './buildPlanSections'
import { useSectionScrollSpy } from './useSectionScrollSpy'
import './BuildPlanView.css'

interface SectionScaffold {
  subtitle?: ReactNode
  placeholderLabel: string
  placeholderHint?: string
  placeholderMinHeightPx: number
}

const SCAFFOLD_BY_SECTION_ID: Record<BuildPlanSectionId, SectionScaffold> = {
  levels: {
    subtitle: '1–20 · click a level → level-up modal',
    placeholderLabel: 'Level track — 20 rows: class taken, feats, ability raises',
    placeholderMinHeightPx: 160,
  },
  skills: {
    placeholderLabel: 'Skills grid — ranks per level, mono numbers',
    placeholderMinHeightPx: 110,
  },
  spells: {
    subtitle: 'picker per spell level',
    placeholderLabel: 'Known spells by level + spell picker',
    placeholderMinHeightPx: 110,
  },
  enhancements: {
    subtitle: <span className="num">62 / 80 AP</span>,
    placeholderLabel: 'Up to 7 tree tabs · tree canvas with nodes and tiers',
    placeholderHint: 'Tier 5 in one tree only · racial tree separate AP',
    placeholderMinHeightPx: 200,
  },
  destinies: {
    subtitle: 'level 20+',
    placeholderLabel: 'Destiny trees + mantle',
    placeholderHint: 'Shown only when character level ≥ 20',
    placeholderMinHeightPx: 90,
  },
  reaper: {
    subtitle: 'survival points, not AP',
    placeholderLabel: '3 reaper trees',
    placeholderMinHeightPx: 90,
  },
}

const BUILD_PLAN_SECTION_IDS = BUILD_PLAN_SECTIONS.map((section) => section.id)

export function BuildPlanView(): JSX.Element {
  const pageEndRef = useRef<HTMLDivElement | null>(null)
  useSectionScrollSpy(BUILD_PLAN_SECTION_IDS, pageEndRef)

  return (
    <div className="page">
      <div className="build-plan-view-sections">
        <PageSection title="Build header">
          <WireframePlaceholder
            label="Race · point buy · class split (Sorcerer 20) · tomes"
            minHeightPx={70}
          />
        </PageSection>
        {BUILD_PLAN_SECTIONS.map((section) => {
          const scaffold = SCAFFOLD_BY_SECTION_ID[section.id]
          return (
            <PageSection
              key={section.id}
              id={section.id}
              title={section.label}
              subtitle={scaffold.subtitle}
            >
              <WireframePlaceholder
                label={scaffold.placeholderLabel}
                hint={scaffold.placeholderHint}
                minHeightPx={scaffold.placeholderMinHeightPx}
              />
            </PageSection>
          )
        })}
      </div>
      <div ref={pageEndRef} aria-hidden />
    </div>
  )
}
