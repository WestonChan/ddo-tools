import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'

export interface CharactersTileSummary {
  characterName: string
  classLabel: string
  raceLabel: string
  pastLifeTotalCount: number
}

const DEFAULT_CHARACTERS_TILE_DESCRIPTION = 'Manage characters, lives, planned builds'

function pastLifeCountLabel(pastLifeCount: number): string {
  return pastLifeCount === 1 ? '1 past life' : `${pastLifeCount} past lives`
}

function charactersTileDescription(summary: CharactersTileSummary | null): string {
  if (summary === null) return DEFAULT_CHARACTERS_TILE_DESCRIPTION
  return [
    summary.characterName,
    summary.classLabel,
    summary.raceLabel,
    summary.pastLifeTotalCount > 0 ? pastLifeCountLabel(summary.pastLifeTotalCount) : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

function EntryTile({
  to,
  title,
  description,
}: {
  to: '/characters' | '/build-plan' | '/gear' | '/resources'
  title: string
  description: string
}): JSX.Element {
  return (
    <Link to={to} className="landing-tile">
      <span className="landing-tile-title">{title}</span>
      <span className="landing-tile-description">{description}</span>
    </Link>
  )
}

export function EntryTiles({
  activeCharacterSummary,
}: {
  activeCharacterSummary: CharactersTileSummary | null
}): JSX.Element {
  return (
    <nav className="landing-tiles" aria-label="Start">
      <EntryTile
        to="/characters"
        title="Characters & builds"
        description={charactersTileDescription(activeCharacterSummary)}
      />
      <EntryTile
        to="/build-plan"
        title="Build plan"
        description="Levels, feats, spells, enhancements"
      />
      <EntryTile to="/gear" title="Gear" description="Gear sets, finder, comparison" />
      <EntryTile
        to="/resources"
        title="Resources"
        description="Browse items, spells, feats, crafting systems"
      />
    </nav>
  )
}
