import type { JSX } from 'react'
import { HintAnchor } from '../../../../components'
import type { Note, NoteKind } from '../../queries/notes'
import './NoteMarker.css'

const NOTE_PRESENTATION: Record<NoteKind, { label: string; symbol: string }> = {
  game_bug: { label: 'Bug', symbol: '!' },
  unverified: { label: 'Unverified', symbol: '?' },
}

export function NoteMarker({ note }: { note: Note }): JSX.Element {
  const presentation = NOTE_PRESENTATION[note.kind]
  const value = note.kind === 'game_bug' ? note.intended : note.assumed
  const valueText = typeof value === 'string' ? value : JSON.stringify(value)
  const valueLabel = note.kind === 'game_bug' ? 'Intended' : 'Assumed'
  return (
    <HintAnchor text={`${note.text}\n${valueLabel}: ${valueText}`}>
      <span
        className="resources-note-marker focus-ring-proxy"
        tabIndex={0}
        data-note-kind={note.kind}
      >
        {presentation.symbol} {presentation.label}
      </span>
    </HintAnchor>
  )
}

export function NoteBadges({ notes }: { notes: readonly Note[] }): JSX.Element {
  return (
    <>
      {notes.map((note, index) => (
        <span key={index} className="resources-chip">
          <NoteMarker note={note} />
        </span>
      ))}
    </>
  )
}
