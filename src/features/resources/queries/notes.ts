import {
  API_RESPONSE_ERROR,
  ApiError,
  assertApiResponseFields,
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
    assertApiResponseFields(
      note,
      path,
      {
        kind: 'string',
        field: 'nullable-string',
        qualifier: 'nullable-string',
        text: 'string',
        in_game: 'boolean',
        recorded: 'string',
      },
      notePrefix,
    )
    const invalidField =
      note.kind !== 'game_bug' && note.kind !== 'unverified'
        ? 'kind'
        : note.intended === undefined
          ? 'intended'
          : note.assumed === undefined
            ? 'assumed'
            : null
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
