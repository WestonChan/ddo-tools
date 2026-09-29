import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, UserPlus } from 'lucide-react'
import { useCharacters, classSplitLabel, raceLabelOf } from '../../character'
import { ORDERED_PAST_LIFE_CATEGORIES, pastLifeCountsOf } from '../pastLifeCounts'

export function ActiveCharacterCard(): JSX.Element {
  const { selectedCharacter, viewedBuild, currentLifeNumber, characters, plannedBuilds } = useCharacters()

  if (characters.length === 0) {
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

  const buildName = viewedBuild?.name?.trim()
  const raceLabel = viewedBuild ? raceLabelOf(viewedBuild.race) : ''
  const classLabel = viewedBuild ? classSplitLabel(viewedBuild) : ''
  const serverLabel = selectedCharacter.server ? `${selectedCharacter.server} server` : ''
  const buildSubtitleParts = [raceLabel, `Life ${currentLifeNumber}`, serverLabel].filter(Boolean)

  const pastLifeCounts = pastLifeCountsOf(selectedCharacter)
  const pastLifeCategoriesToShow = ORDERED_PAST_LIFE_CATEGORIES.filter(({ category }) => pastLifeCounts.countByCategory[category] > 0)

  return (
    <section className="landing-card landing-active-character">
      <header className="landing-active-character-heading">
        <span className="landing-card-eyebrow">Continue where you left off</span>
        <h2 className="landing-card-title">{selectedCharacter.name}</h2>
      </header>

      <dl className="landing-active-character-sections">
        <div className="landing-section">
          <dt>Current build</dt>
          <dd className="landing-build-detail">
            {buildName && <span className="landing-build-name">{buildName}</span>}
            {buildSubtitleParts.length > 0 && (
              <span className="landing-build-classes">{buildSubtitleParts.join(' · ')}</span>
            )}
            {classLabel && <span className="landing-build-meta">{classLabel}</span>}
          </dd>
        </div>

        {pastLifeCounts.totalCount > 0 && (
          <div className="landing-section">
            <dt>Past lives ({pastLifeCounts.totalCount})</dt>
            <dd>
              <ul className="landing-stat-rows">
                {pastLifeCategoriesToShow.map(({ category, label }) => (
                  <li key={category}>
                    <span className="landing-stat-count">{pastLifeCounts.countByCategory[category]}</span>
                    <span className="landing-stat-label">{label}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}

        {plannedBuilds.length > 0 && (
          <div className="landing-section">
            <dt>Planned builds</dt>
            <dd>
              <span className="landing-build-classes">{plannedBuilds.length}</span>
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
