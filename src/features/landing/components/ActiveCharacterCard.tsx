import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, UserPlus } from 'lucide-react'

export interface ActiveCharacterCardSummary {
  characterName: string
  buildName: string
  buildSubtitle: string
  classLabel: string
  pastLifeTotalCount: number
  pastLifeCategoryCounts: { category: string; label: string; count: number }[]
  plannedBuildCount: number
}

export function ActiveCharacterCard({ summary }: { summary: ActiveCharacterCardSummary | null }): JSX.Element {
  if (summary === null) {
    return (
      <section className="landing-card landing-active-character landing-active-character--empty">
        <div className="landing-active-character-heading">
          <span className="landing-card-eyebrow">Welcome</span>
          <h2 className="landing-card-title">Create your first character</h2>
        </div>
        <p className="landing-card-body">
          Start by naming a character — add lives, past lives, and planned builds from there.
        </p>
        <Link to="/characters" className="landing-cta hoverable">
          <UserPlus size={16} />
          <span>Get started</span>
        </Link>
      </section>
    )
  }

  return (
    <section className="landing-card landing-active-character">
      <header className="landing-active-character-heading">
        <span className="landing-card-eyebrow">Continue where you left off</span>
        <h2 className="landing-card-title">{summary.characterName}</h2>
      </header>

      <dl className="landing-active-character-sections">
        <div className="landing-section">
          <dt>Current build</dt>
          <dd className="landing-build-detail">
            {summary.buildName && <span className="landing-build-name">{summary.buildName}</span>}
            {summary.buildSubtitle && <span className="landing-build-classes">{summary.buildSubtitle}</span>}
            {summary.classLabel && <span className="landing-build-meta">{summary.classLabel}</span>}
          </dd>
        </div>

        {summary.pastLifeTotalCount > 0 && (
          <div className="landing-section">
            <dt>Past lives ({summary.pastLifeTotalCount})</dt>
            <dd>
              <ul className="landing-stat-rows">
                {summary.pastLifeCategoryCounts.map(({ category, label, count }) => (
                  <li key={category}>
                    <span className="landing-stat-count">{count}</span>
                    <span className="landing-stat-label">{label}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}

        {summary.plannedBuildCount > 0 && (
          <div className="landing-section">
            <dt>Planned builds</dt>
            <dd>
              <span className="landing-build-classes">{summary.plannedBuildCount}</span>
              <span className="landing-inline-meta"> saved</span>
            </dd>
          </div>
        )}
      </dl>

      <Link to="/build-plan" className="landing-cta hoverable">
        <span>Open build plan</span>
        <ArrowRight size={16} />
      </Link>
    </section>
  )
}
