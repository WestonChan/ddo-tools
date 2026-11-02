import { isRecord } from '../isRecord'
import type { ApiNote, JsonValue } from './types'

function isJsonValue(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (Array.isArray(value)
      ? value.every(isJsonValue)
      : isRecord(value) && Object.values(value).every(isJsonValue))
  )
}

const NOTE_FIELD_GUARDS = {
  kind: (value) => value === 'game_bug' || value === 'unverified',
  field: (value) => value === null || typeof value === 'string',
  qualifier: (value) => value === null || typeof value === 'string',
  text: (value) => typeof value === 'string',
  intended: isJsonValue,
  assumed: isJsonValue,
  in_game: (value) => typeof value === 'boolean',
  recorded: (value) => typeof value === 'string',
} satisfies { [Field in keyof ApiNote]: (value: unknown) => value is ApiNote[Field] }

export function invalidApiNoteField(note: unknown): keyof ApiNote | null {
  if (!isRecord(note)) return 'kind'
  for (const field of Object.keys(NOTE_FIELD_GUARDS) as Array<keyof ApiNote>)
    if (!NOTE_FIELD_GUARDS[field](note[field])) return field
  return null
}

export function isApiNote(note: unknown): note is ApiNote {
  return invalidApiNoteField(note) === null
}
