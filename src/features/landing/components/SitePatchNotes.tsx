import { useState, type JSX } from 'react'
import { ChevronDown } from 'lucide-react'
import { SITE_PATCH_NOTES, type PatchNote } from '../data/sitePatchNotes'
import { formatPatchDate } from '../utils'

const INITIAL_VISIBLE = 3

function PatchNoteEntry({ note }: { note: PatchNote }): JSX.Element {
  return (
    <article className="landing-patch-entry">
      <h3 className="landing-patch-date">{formatPatchDate(note.date)}</h3>
      <ul className="landing-patch-changes">
        {note.changes.map((change, i) => (
          <li key={i}>{change}</li>
        ))}
      </ul>
    </article>
  )
}

export function SitePatchNotes(): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? SITE_PATCH_NOTES : SITE_PATCH_NOTES.slice(0, INITIAL_VISIBLE)
  const hiddenCount = SITE_PATCH_NOTES.length - INITIAL_VISIBLE

  return (
    <section className="landing-card landing-patch-notes">
      <h2 className="landing-card-title">Site updates</h2>
      {visible.map((note) => (
        <PatchNoteEntry key={note.date} note={note} />
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          className="landing-patch-toggle hoverable"
          onClick={() => setExpanded((e) => !e)}
        >
          <ChevronDown
            size={14}
            className={`landing-patch-toggle-chevron${expanded ? ' is-open' : ''}`}
          />
          <span>{expanded ? 'Show fewer updates' : `Show ${hiddenCount} older update${hiddenCount === 1 ? '' : 's'}`}</span>
        </button>
      )}
    </section>
  )
}
