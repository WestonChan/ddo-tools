import type { JSX } from 'react'
import { LandingHero } from './components/LandingHero'
import { ActiveCharacterCard, type ActiveCharacterCardSummary } from './components/ActiveCharacterCard'
import { SitePatchNotesCard } from './components/SitePatchNotesCard'
import { DdoPatchNotesCard } from './components/DdoPatchNotesCard'
import { LandingFooter } from './components/LandingFooter'
import './LandingView.css'

function LandingView({
  activeCharacterSummary,
}: {
  activeCharacterSummary: ActiveCharacterCardSummary | null
}): JSX.Element {
  return (
    <div className="landing-view">
      <LandingHero />
      <div className="landing-grid">
        <div className="landing-grid-area-character">
          <ActiveCharacterCard summary={activeCharacterSummary} />
        </div>
        <div className="landing-grid-area-ddo">
          <DdoPatchNotesCard />
        </div>
        <div className="landing-grid-area-patch">
          <SitePatchNotesCard />
        </div>
      </div>
      <LandingFooter />
    </div>
  )
}

export default LandingView
