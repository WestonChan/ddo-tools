import type { JSX } from 'react'
import { LandingHero } from './components/LandingHero'
import { ActiveCharacterCard } from './components/ActiveCharacterCard'
import { SitePatchNotesCard } from './components/SitePatchNotesCard'
import { DdoPatchNotesCard } from './components/DdoPatchNotesCard'
import { LandingFooter } from './components/LandingFooter'
import './LandingView.css'

function LandingView(): JSX.Element {
  return (
    <div className="landing-view">
      <LandingHero />
      <div className="landing-grid">
        <div className="landing-grid-area-character">
          <ActiveCharacterCard />
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
