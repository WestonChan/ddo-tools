import type { JSX } from 'react'
import { LandingHero } from './components/LandingHero'
import { LandingActiveCharacter } from './components/LandingActiveCharacter'
import { SitePatchNotes } from './components/SitePatchNotes'
import { DdoPatchNotesCard } from './components/DdoPatchNotesCard'
import { LandingFooter } from './components/LandingFooter'
import './LandingView.css'

function LandingView(): JSX.Element {
  return (
    <div className="landing-view">
      <LandingHero />
      <div className="landing-grid">
        <div className="landing-grid-area-character">
          <LandingActiveCharacter />
        </div>
        <div className="landing-grid-area-ddo">
          <DdoPatchNotesCard />
        </div>
        <div className="landing-grid-area-patch">
          <SitePatchNotes />
        </div>
      </div>
      <LandingFooter />
    </div>
  )
}

export default LandingView
