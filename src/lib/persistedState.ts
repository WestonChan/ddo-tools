export type StorageAreaName = 'localStorage' | 'sessionStorage'

export interface PersistedState<Snapshot, Change> {
  snapshot: () => Snapshot
  subscribe: (listener: () => void) => () => void
  save: (change: Change) => boolean
}

export interface PersistedRecordField<FamilyKey, Value> {
  storageArea: StorageAreaName
  version?: number
  defaultValue: (familyKey: FamilyKey) => Value
  validatedValue: (candidate: unknown, familyKey: FamilyKey) => Value | undefined
}

interface PersistedValueOptions<Value> {
  storageArea: StorageAreaName
  codec: 'text' | 'json'
  defaultValue: Value
  validatedValue: (candidate: unknown) => Value | undefined
}

interface TextValueOptions<Value extends string> extends PersistedValueOptions<Value> {
  codec: 'text'
}

interface JsonValueOptions<Value> extends PersistedValueOptions<Value> {
  codec: 'json'
}

type FieldValues = Record<string, unknown>

interface StoredArea {
  storageArea: StorageAreaName
  storageKey: string
  fieldNames: readonly string[]
  decodedFields: (storedText: string | null) => FieldValues
  encodedText: (fields: FieldValues) => string
  roundTrippedField: (fieldName: string, value: unknown) => unknown
}

const REJECTED_FIELD = Symbol('rejected field')

interface RegisteredState {
  forgetSnapshot: () => void
  notifyListeners: () => void
}

const VALUE_FIELD_NAME = 'value'
const DEFAULT_FIELD_VERSION = 1

const registeredStates = new Set<RegisteredState>()

function reachableStorage(storageArea: StorageAreaName): Storage | null {
  try {
    return window[storageArea]
  } catch {
    return null
  }
}

function storedText(storageArea: StorageAreaName, storageKey: string): string | null {
  try {
    return reachableStorage(storageArea)?.getItem(storageKey) ?? null
  } catch {
    return null
  }
}

function writeStoredText(storageArea: StorageAreaName, storageKey: string, text: string): boolean {
  try {
    const storage = reachableStorage(storageArea)
    if (!storage) return false
    storage.setItem(storageKey, text)
    return true
  } catch {
    return false
  }
}

function isPlainObject(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function jsonText(value: unknown): string {
  const text = JSON.stringify(value)
  if (text === undefined) throw new TypeError('Value has no JSON form')
  return text
}

function valueArea<Value>(storageKey: string, options: PersistedValueOptions<Value>): StoredArea {
  function validatedText(text: string): Value | undefined {
    const candidate = options.codec === 'text' ? text : JSON.parse(text)
    return options.validatedValue(candidate)
  }
  function decodedValue(text: string | null): Value {
    if (text === null) return options.defaultValue
    try {
      const validated = validatedText(text)
      return validated === undefined ? options.defaultValue : validated
    } catch {
      return options.defaultValue
    }
  }
  function encodedValue(value: unknown): string {
    return options.codec === 'text' ? String(value) : jsonText(value)
  }
  return {
    storageArea: options.storageArea,
    storageKey,
    fieldNames: [VALUE_FIELD_NAME],
    decodedFields: (text) => ({ [VALUE_FIELD_NAME]: decodedValue(text) }),
    encodedText: (fields) => encodedValue(fields[VALUE_FIELD_NAME]),
    roundTrippedField: (_fieldName, value) => {
      try {
        const validated = validatedText(encodedValue(value))
        return validated === undefined ? REJECTED_FIELD : validated
      } catch {
        return REJECTED_FIELD
      }
    },
  }
}

function recordArea<FamilyKey extends string>(
  familyKey: FamilyKey,
  storageArea: StorageAreaName,
  storageKey: string,
  fields: Record<string, PersistedRecordField<FamilyKey, unknown>>,
): StoredArea {
  const fieldNames = Object.keys(fields)
  function versionOf(fieldName: string): number {
    return fields[fieldName].version ?? DEFAULT_FIELD_VERSION
  }
  function readField(fieldName: string, candidate: unknown): unknown {
    const field = fields[fieldName]
    try {
      const validated = field.validatedValue(candidate, familyKey)
      return validated === undefined ? field.defaultValue(familyKey) : validated
    } catch {
      return field.defaultValue(familyKey)
    }
  }
  return {
    storageArea,
    storageKey,
    fieldNames,
    decodedFields: (text) => {
      let stored: Record<string, unknown> = {}
      try {
        const parsed: unknown = text === null ? null : JSON.parse(text)
        if (isPlainObject(parsed)) stored = parsed
      } catch {}
      const decoded: FieldValues = {}
      for (const fieldName of fieldNames) {
        const entry = Object.hasOwn(stored, fieldName) ? stored[fieldName] : undefined
        const isCurrentEntry =
          isPlainObject(entry) &&
          entry.version === versionOf(fieldName) &&
          Object.hasOwn(entry, 'value')
        decoded[fieldName] = isCurrentEntry
          ? readField(fieldName, entry.value)
          : fields[fieldName].defaultValue(familyKey)
      }
      return decoded
    },
    encodedText: (values) =>
      jsonText(
        Object.fromEntries(
          fieldNames.map((fieldName) => [
            fieldName,
            { version: versionOf(fieldName), value: values[fieldName] },
          ]),
        ),
      ),
    roundTrippedField: (fieldName, value) => {
      try {
        const validated = fields[fieldName].validatedValue(JSON.parse(jsonText(value)), familyKey)
        return validated === undefined ? REJECTED_FIELD : validated
      } catch {
        return REJECTED_FIELD
      }
    },
  }
}

function createStateFamily<FamilyKey extends string, Fields extends object>(
  areasFor: (familyKey: FamilyKey) => StoredArea[],
): (familyKey: FamilyKey) => PersistedState<Fields, Partial<Fields>> {
  const statesByFamilyKey = new Map<FamilyKey, PersistedState<Fields, Partial<Fields>>>()

  function createState(familyKey: FamilyKey): PersistedState<Fields, Partial<Fields>> {
    const areas = areasFor(familyKey)
    const listeners = new Set<() => void>()
    let cachedSnapshot: FieldValues | null = null

    function readSnapshot(): FieldValues {
      return Object.assign(
        {},
        ...areas.map((area) => area.decodedFields(storedText(area.storageArea, area.storageKey))),
      )
    }

    function notifyListeners(): void {
      listeners.forEach((listener) => listener())
    }

    registeredStates.add({
      forgetSnapshot: () => {
        cachedSnapshot = null
      },
      notifyListeners,
    })

    function snapshot(): Fields {
      cachedSnapshot ??= readSnapshot()
      return cachedSnapshot as Fields
    }

    function subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }

    function save(change: Partial<Fields>): boolean {
      const nextSnapshot: FieldValues = { ...(snapshot() as FieldValues) }
      const changedAreas: StoredArea[] = []
      let isRejected = false
      for (const area of areas) {
        const changedFieldNames = area.fieldNames.filter(
          (fieldName) =>
            Object.hasOwn(change, fieldName) && (change as FieldValues)[fieldName] !== undefined,
        )
        if (changedFieldNames.length === 0) continue
        for (const fieldName of changedFieldNames) {
          const roundTripped = area.roundTrippedField(fieldName, (change as FieldValues)[fieldName])
          if (roundTripped === REJECTED_FIELD) isRejected = true
          nextSnapshot[fieldName] = roundTripped
        }
        changedAreas.push(area)
      }
      if (isRejected) return false
      if (changedAreas.length === 0) return true
      cachedSnapshot = nextSnapshot
      let areAllWritesSuccessful = true
      for (const area of changedAreas) {
        let wasWritten = false
        try {
          wasWritten = writeStoredText(
            area.storageArea,
            area.storageKey,
            area.encodedText(nextSnapshot),
          )
        } catch {}
        areAllWritesSuccessful = wasWritten && areAllWritesSuccessful
      }
      notifyListeners()
      return areAllWritesSuccessful
    }

    return { snapshot, subscribe, save }
  }

  return (familyKey) => {
    let state = statesByFamilyKey.get(familyKey)
    if (!state) {
      state = createState(familyKey)
      statesByFamilyKey.set(familyKey, state)
    }
    return state
  }
}

function singleValueState<Value>(
  state: PersistedState<{ value: Value }, Partial<{ value: Value }>>,
): PersistedState<Value, Value> {
  return {
    snapshot: () => state.snapshot().value,
    subscribe: state.subscribe,
    save: (value) => state.save({ value }),
  }
}

function valueFamily<FamilyKey extends string, Value>(
  storageKeyFor: (familyKey: FamilyKey) => string,
  options: PersistedValueOptions<Value>,
): (familyKey: FamilyKey) => PersistedState<Value, Value> {
  const stateFamily = createStateFamily<FamilyKey, { value: Value }>((familyKey) => [
    valueArea(storageKeyFor(familyKey), options),
  ])
  const valueStatesByFamilyKey = new Map<FamilyKey, PersistedState<Value, Value>>()
  return (familyKey) => {
    let valueState = valueStatesByFamilyKey.get(familyKey)
    if (!valueState) {
      valueState = singleValueState(stateFamily(familyKey))
      valueStatesByFamilyKey.set(familyKey, valueState)
    }
    return valueState
  }
}

export function createPersistedValue<Value extends string>(
  options: TextValueOptions<Value> & { storageKey: string },
): PersistedState<Value, Value>
export function createPersistedValue<Value>(
  options: JsonValueOptions<Value> & { storageKey: string },
): PersistedState<Value, Value>
export function createPersistedValue<Value>(
  options: PersistedValueOptions<Value> & { storageKey: string },
): PersistedState<Value, Value> {
  return valueFamily(() => options.storageKey, options)(options.storageKey)
}

export function createPersistedValueFamily<FamilyKey extends string, Value extends string>(
  options: TextValueOptions<Value> & { storageKeyFor: (familyKey: FamilyKey) => string },
): (familyKey: FamilyKey) => PersistedState<Value, Value>
export function createPersistedValueFamily<FamilyKey extends string, Value>(
  options: JsonValueOptions<Value> & { storageKeyFor: (familyKey: FamilyKey) => string },
): (familyKey: FamilyKey) => PersistedState<Value, Value>
export function createPersistedValueFamily<FamilyKey extends string, Value>(
  options: PersistedValueOptions<Value> & { storageKeyFor: (familyKey: FamilyKey) => string },
): (familyKey: FamilyKey) => PersistedState<Value, Value> {
  return valueFamily(options.storageKeyFor, options)
}

export function createPersistedRecordFamily<
  FamilyKey extends string,
  StoredRecord extends object,
>(options: {
  storageKeyFor: (familyKey: FamilyKey, storageArea: StorageAreaName) => string
  fields: { [Field in keyof StoredRecord]-?: PersistedRecordField<FamilyKey, StoredRecord[Field]> }
}): (familyKey: FamilyKey) => PersistedState<StoredRecord, Partial<StoredRecord>> {
  const fieldsByName = options.fields as Record<string, PersistedRecordField<FamilyKey, unknown>>
  const storageAreaNames = [
    ...new Set(Object.values(fieldsByName).map((field) => field.storageArea)),
  ]
  return createStateFamily<FamilyKey, StoredRecord>((familyKey) =>
    storageAreaNames.map((storageArea) =>
      recordArea(
        familyKey,
        storageArea,
        options.storageKeyFor(familyKey, storageArea),
        Object.fromEntries(
          Object.entries(fieldsByName).filter(([, field]) => field.storageArea === storageArea),
        ),
      ),
    ),
  )
}

export function resetPersistedStateForTests(): void {
  registeredStates.forEach((state) => state.forgetSnapshot())
  registeredStates.forEach((state) => state.notifyListeners())
}
