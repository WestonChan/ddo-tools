import type { JSX } from 'react'
import { ExternalLink } from 'lucide-react'

export function DdoPatchNotesCard(): JSX.Element {
  return (
    <section className="landing-card landing-ddo-patch-notes">
      <h2 className="landing-card-title">DDO game updates</h2>
      <p className="landing-card-body">
        The latest DDO update notes live on DDO Wiki. Patches change which items, feats, and
        enhancements are current — check before finalizing a build.
      </p>
      <a
        className="landing-cta hoverable"
        href="https://ddowiki.com/page/Updates"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>View Updates on DDO Wiki</span>
        <ExternalLink size={16} />
      </a>
    </section>
  )
}
