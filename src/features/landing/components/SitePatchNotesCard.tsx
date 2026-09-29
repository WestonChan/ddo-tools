import { useState, type JSX } from 'react'
import { ChevronDown } from 'lucide-react'
import { SITE_PATCH_NOTES, type PatchNote } from '../data/sitePatchNotes'
import { formattedPatchDate } from '../patchNoteDates'

const INITIALLY_VISIBLE_PATCH_NOTE_COUNT = 3

function PatchNoteEntry({ note }: { note: PatchNote }): JSX.Element {
  return (
    <article className="landing-patch-entry">
      <h3 className="landing-patch-date">{formattedPatchDate(note.date)}</h3>
      <ul className="landing-patch-changes">
        {note.changes.map((change, i) => (
          <li key={i}>{change}</li>
        ))}
      </ul>
    </article>
  )
}

export function SitePatchNotesCard(): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const visiblePatchNotes = isExpanded ? SITE_PATCH_NOTES : SITE_PATCH_NOTES.slice(0, INITIALLY_VISIBLE_PATCH_NOTE_COUNT)
  const olderPatchNoteCount = SITE_PATCH_NOTES.length - INITIALLY_VISIBLE_PATCH_NOTE_COUNT

  return (
    <section className="landing-card landing-patch-notes">
      <h2 className="landing-card-title">Site updates</h2>
      {visiblePatchNotes.map((note) => (
        <PatchNoteEntry key={note.date} note={note} />
      ))}
      {olderPatchNoteCount > 0 && (
        <button
          type="button"
          className="landing-patch-toggle hoverable"
          onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
        >
          <ChevronDown
            size={14}
            className={`landing-patch-toggle-chevron${isExpanded ? ' is-open' : ''}`}
          />
          <span>{isExpanded ? 'Show fewer updates' : `Show ${olderPatchNoteCount} older update${olderPatchNoteCount === 1 ? '' : 's'}`}</span>
        </button>
      )}
    </section>
  )
}
