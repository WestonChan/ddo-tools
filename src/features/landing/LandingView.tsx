import type { JSX } from 'react'
import { EntryTiles, type CharactersTileSummary } from './components/EntryTiles'
import { SitePatchNotesCard } from './components/SitePatchNotesCard'
import { DdoPatchNotesCard } from './components/DdoPatchNotesCard'
import { LandingFooter } from './components/LandingFooter'
import './LandingView.css'

function LandingView({
  activeCharacterSummary,
}: {
  activeCharacterSummary: CharactersTileSummary | null
}): JSX.Element {
  return (
    <div className="page landing-view">
      <header className="landing-header">
        <h1 className="landing-wordmark">DDO Tools</h1>
        <p className="landing-tagline">
          Build planner and reference for Dungeons &amp; Dragons Online
        </p>
      </header>
      <EntryTiles activeCharacterSummary={activeCharacterSummary} />
      <div className="landing-patch-notes-grid">
        <SitePatchNotesCard />
        <DdoPatchNotesCard />
      </div>
      <LandingFooter />
    </div>
  )
}

export default LandingView
