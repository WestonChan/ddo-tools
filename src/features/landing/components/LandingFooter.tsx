import type { JSX } from 'react'
import { ExternalLink } from 'lucide-react'
import { REPOSITORY_URL } from '../../../lib/githubIssue'
import { SITE_PATCH_NOTES } from '../data/sitePatchNotes'
import { formattedPatchDate, latestPatchNoteDate } from '../patchNoteDates'

export function LandingFooter(): JSX.Element {
  return (
    <footer className="landing-footer">
      <span>v{__APP_VERSION__}</span>
      <span aria-hidden="true">·</span>
      <span>Updated {formattedPatchDate(latestPatchNoteDate(SITE_PATCH_NOTES))}</span>
      <span aria-hidden="true">·</span>
      <a className="landing-footer-link" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
        <span>GitHub</span>
        <ExternalLink size={12} />
      </a>
    </footer>
  )
}
