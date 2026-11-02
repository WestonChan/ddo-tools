import { Fragment, type JSX } from 'react'
import type { Note } from '../../queries/notes'
import { NoteMarker } from './NoteMarker'

export function EffectRowLabel({
  name,
  notes,
}: {
  name: string
  notes: readonly Note[]
}): JSX.Element {
  return (
    <>
      {name}
      {notes.map((note, index) => (
        <Fragment key={index}>
          {' '}
          <NoteMarker note={note} />
        </Fragment>
      ))}
    </>
  )
}
