import {
  API_RESPONSE_ERROR,
  ApiError,
  assertApiResponseFields,
  invalidApiNoteField,
  type ApiNote,
} from '../../../lib/api'

export type NoteKind = ApiNote['kind']

export interface Note extends Omit<ApiNote, 'in_game'> {
  isInGame: boolean
}

export function toNotes(owner: { notes: ApiNote[] }, path: string, prefix = ''): Note[] {
  assertApiResponseFields(owner, path, { notes: 'array' }, prefix)
  return owner.notes.map((note, index) => {
    const notePrefix = `${prefix}notes[${index}].`
    const invalidField = invalidApiNoteField(note)
    if (invalidField)
      throw new ApiError(
        API_RESPONSE_ERROR,
        0,
        `Invalid response for ${path}: ${notePrefix}${invalidField}`,
      )
    return {
      kind: note.kind,
      field: note.field,
      qualifier: note.qualifier,
      text: note.text,
      intended: note.intended,
      assumed: note.assumed,
      isInGame: note.in_game,
      recorded: note.recorded,
    }
  })
}
