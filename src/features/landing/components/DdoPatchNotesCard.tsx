import type { JSX } from 'react'
import { ExternalLink } from 'lucide-react'

export function DdoPatchNotesCard(): JSX.Element {
  return (
    <section className="card landing-ddo-patch-notes">
      <header className="card-header">
        <h2 className="section-label">DDO game updates</h2>
      </header>
      <div className="landing-card-body">
        <p className="landing-card-text">
          The latest DDO update notes live on DDO Wiki. Patches change which items, feats, and
          enhancements are current — check before finalizing a build.
        </p>
        <a
          className="btn-ghost landing-card-action"
          href="https://ddowiki.com/page/Updates"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>View updates on DDO Wiki</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </section>
  )
}
