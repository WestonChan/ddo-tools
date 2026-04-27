import type { JSX } from 'react'
import { AmpersandMark } from '../../../components'

export function LandingHero(): JSX.Element {
  return (
    <header className="landing-hero">
      <AmpersandMark className="landing-hero-mark" size={88} />
      <div className="landing-hero-text">
        <h1 className="landing-hero-title">DDO Tools</h1>
        <p className="landing-hero-tagline">
          Character and gear planning for Dungeons &amp; Dragons Online.
        </p>
      </div>
    </header>
  )
}
