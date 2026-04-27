import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, UserPlus } from 'lucide-react'
import { useCharacter, formatClassSummary, formatRace } from '../../character'
import { PAST_LIFE_ORDER, countPastLives } from '../utils'

export function LandingActiveCharacter(): JSX.Element {
  const { character, activeBuild, lifeNumber, characters, plannedBuilds } = useCharacter()

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

  const buildName = activeBuild?.name?.trim()
  const raceLabel = activeBuild ? formatRace(activeBuild.race) : ''
  const classLabel = activeBuild ? formatClassSummary(activeBuild) : ''
  const serverLabel = character.server ? `${character.server} server` : ''
  const metaParts = [raceLabel, `Life ${lifeNumber}`, serverLabel].filter(Boolean)

  const pastLives = countPastLives(character)
  const pastLifeRows = PAST_LIFE_ORDER.filter(({ key }) => pastLives.byCategory[key] > 0)

  return (
    <section className="landing-card landing-active-character">
      <header className="landing-active-character-heading">
        <span className="landing-card-eyebrow">Continue where you left off</span>
        <h2 className="landing-card-title">{character.name}</h2>
      </header>

      <dl className="landing-active-character-sections">
        <div className="landing-section">
          <dt>Current build</dt>
          <dd className="landing-build-detail">
            {buildName && <span className="landing-build-name">{buildName}</span>}
            {metaParts.length > 0 && (
              <span className="landing-build-classes">{metaParts.join(' · ')}</span>
            )}
            {classLabel && <span className="landing-build-meta">{classLabel}</span>}
          </dd>
        </div>

        {pastLives.total > 0 && (
          <div className="landing-section">
            <dt>Past lives ({pastLives.total})</dt>
            <dd>
              <ul className="landing-stat-rows">
                {pastLifeRows.map(({ key, label }) => (
                  <li key={key}>
                    <span className="landing-stat-count">{pastLives.byCategory[key]}</span>
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
