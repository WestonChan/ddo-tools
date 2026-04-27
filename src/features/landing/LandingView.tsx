import type { JSX } from 'react'
import { LandingHero } from './components/LandingHero'
import { LandingActiveCharacter } from './components/LandingActiveCharacter'
import { SitePatchNotes } from './components/SitePatchNotes'
import { DdoPatchNotesCard } from './components/DdoPatchNotesCard'
import './LandingView.css'

// LandingView owns the grid layout — each child card sits inside a positioning
// wrapper that carries the grid-area assignment, so the card components stay
// layout-agnostic and could be reused elsewhere unchanged.
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
    </div>
  )
}

export default LandingView
