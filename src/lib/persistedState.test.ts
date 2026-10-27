import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPersistedRecordFamily,
  createPersistedValue,
  createPersistedValueFamily,
  resetPersistedStateForTests,
} from './persistedState'

interface Preferences {
  filters: string[]
  minimumLevel: number
  searchQuery: string
}

const PREFERENCES_KEY = 'test:preferences:items'
const TAB_STATE_KEY = 'test:tab-state:items'

const preferencesFamily = createPersistedRecordFamily<'items' | 'feats', Preferences>({
  storageKeyFor: (category, storageArea) =>
    `test:${storageArea === 'localStorage' ? 'preferences' : 'tab-state'}:${category}`,
  fields: {
    filters: {
      storageArea: 'localStorage',
      defaultValue: () => [],
      validatedValue: (candidate) =>
        Array.isArray(candidate) && candidate.every((entry) => typeof entry === 'string')
          ? candidate
          : undefined,
    },
    minimumLevel: {
      storageArea: 'localStorage',
      version: 2,
      defaultValue: () => 1,
      validatedValue: (candidate) =>
        typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : undefined,
    },
    searchQuery: {
      storageArea: 'sessionStorage',
      defaultValue: () => '',
      validatedValue: (candidate) => (typeof candidate === 'string' ? candidate : undefined),
    },
  },
})

const flagValue = createPersistedValue<boolean>({
  storageArea: 'localStorage',
  storageKey: 'test:flag',
  codec: 'json',
  defaultValue: true,
  validatedValue: (candidate) => (typeof candidate === 'boolean' ? candidate : undefined),
})

const nameValue = createPersistedValue<'Gold' | 'Teal'>({
  storageArea: 'localStorage',
  storageKey: 'test:name',
  codec: 'text',
  defaultValue: 'Gold',
  validatedValue: (candidate) =>
    candidate === 'Gold' || candidate === 'Teal' ? candidate : undefined,
})

const seenFamily = createPersistedValueFamily<string, boolean>({
  storageArea: 'sessionStorage',
  storageKeyFor: (message) => `test:seen:${message}`,
  codec: 'json',
  defaultValue: false,
  validatedValue: (candidate) => candidate === true || undefined,
})

function reload(): void {
  resetPersistedStateForTests()
}

function storedPreferencesJson(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('stored formats', () => {
  it('writes and reads a text value as the raw string', () => {
    nameValue.save('Teal')
    expect(localStorage.getItem('test:name')).toBe('Teal')
    reload()
    expect(nameValue.snapshot()).toBe('Teal')
  })

  it('reads a text value that a page wrote before any module loaded', () => {
    localStorage.setItem('test:name', 'Teal')
    expect(nameValue.snapshot()).toBe('Teal')
  })

  it('writes a json value as bare JSON and reads bare JSON written by older builds', () => {
    flagValue.save(false)
    expect(localStorage.getItem('test:flag')).toBe('false')
    localStorage.setItem('test:flag', 'true')
    reload()
    expect(flagValue.snapshot()).toBe(true)
  })

  it('writes each record area under its own key with per-field versions', () => {
    preferencesFamily('items').save({ filters: ['rare'], minimumLevel: 30, searchQuery: 'ring' })
    expect(storedPreferencesJson()).toEqual({
      filters: { version: 1, value: ['rare'] },
      minimumLevel: { version: 2, value: 30 },
    })
    expect(JSON.parse(sessionStorage.getItem(TAB_STATE_KEY) ?? '{}')).toEqual({
      searchQuery: { version: 1, value: 'ring' },
    })
  })

  it('round-trips a record through a reload', () => {
    preferencesFamily('items').save({ filters: ['rare'], minimumLevel: 30, searchQuery: 'ring' })
    reload()
    expect(preferencesFamily('items').snapshot()).toEqual({
      filters: ['rare'],
      minimumLevel: 30,
      searchQuery: 'ring',
    })
  })
})

describe('fallback on read', () => {
  it('gives defaults for a missing key', () => {
    expect(nameValue.snapshot()).toBe('Gold')
    expect(preferencesFamily('items').snapshot()).toEqual({
      filters: [],
      minimumLevel: 1,
      searchQuery: '',
    })
  })

  it('falls back to the default for a value the validator rejects', () => {
    localStorage.setItem('test:name', 'Chartreuse')
    expect(nameValue.snapshot()).toBe('Gold')
    localStorage.setItem('test:flag', '0')
    expect(flagValue.snapshot()).toBe(true)
  })

  it('falls back to the default for a json value that does not parse', () => {
    localStorage.setItem('test:flag', '{not json')
    expect(flagValue.snapshot()).toBe(true)
  })

  it('gives defaults for the area whose JSON is broken and keeps the other area', () => {
    const items = preferencesFamily('items')
    items.save({ filters: ['rare'], minimumLevel: 30, searchQuery: 'ring' })
    localStorage.setItem(PREFERENCES_KEY, '{broken')
    reload()
    expect(items.snapshot()).toEqual({ filters: [], minimumLevel: 1, searchQuery: 'ring' })
  })

  it('gives defaults for an area whose JSON is not an object', () => {
    const items = preferencesFamily('items')
    items.save({ filters: ['rare'], searchQuery: 'ring' })
    localStorage.setItem(PREFERENCES_KEY, '[1,2]')
    reload()
    expect(items.snapshot()).toEqual({ filters: [], minimumLevel: 1, searchQuery: 'ring' })
  })

  it('resets only the field whose version differs', () => {
    const items = preferencesFamily('items')
    items.save({ filters: ['rare'], minimumLevel: 30 })
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ ...storedPreferencesJson(), minimumLevel: { version: 1, value: 30 } }),
    )
    reload()
    expect(items.snapshot()).toMatchObject({ filters: ['rare'], minimumLevel: 1 })
  })

  it('resets only the field whose shape is wrong', () => {
    const items = preferencesFamily('items')
    items.save({ filters: ['rare'], minimumLevel: 30 })
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ ...storedPreferencesJson(), filters: { version: 1, value: 'rare' } }),
    )
    reload()
    expect(items.snapshot()).toMatchObject({ filters: [], minimumLevel: 30 })
  })

  it('resets a field whose entry is not a versioned object', () => {
    const items = preferencesFamily('items')
    items.save({ filters: ['rare'], minimumLevel: 30 })
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ ...storedPreferencesJson(), filters: ['rare'] }),
    )
    reload()
    expect(items.snapshot()).toMatchObject({ filters: [], minimumLevel: 30 })
  })

  it('ignores unknown keys and __proto__, and drops them on the next write', () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      '{"__proto__":{"version":1,"value":["polluted"]},"toString":{"version":1,"value":["x"]},"retired":{"version":1,"value":1},"filters":{"version":1,"value":["rare"]}}',
    )
    const items = preferencesFamily('items')
    expect(items.snapshot().filters).toEqual(['rare'])
    expect(Object.keys(items.snapshot())).toEqual(['filters', 'minimumLevel', 'searchQuery'])
    items.save({ minimumLevel: 5 })
    expect(Object.keys(storedPreferencesJson()).sort()).toEqual(['filters', 'minimumLevel'])
  })
})

describe('save', () => {
  it('shows after a save exactly what a reload reads', () => {
    const items = preferencesFamily('items')
    const inputs: Partial<Preferences>[] = [
      { filters: ['rare'], minimumLevel: 12, searchQuery: 'ring' },
      { filters: [], minimumLevel: 3 },
      { searchQuery: '' },
    ]
    for (const input of inputs) {
      expect(items.save(input)).toBe(true)
      const syncedSnapshot = items.snapshot()
      reload()
      expect(items.snapshot()).toEqual(syncedSnapshot)
    }
  })

  it.each([
    ['a NaN', { minimumLevel: Number.NaN }],
    ['an infinity', { minimumLevel: Number.POSITIVE_INFINITY }],
    ['a wrong shape', { filters: 'rare' as unknown as string[] }],
    ['a wrong element', { filters: [1] as unknown as string[] }],
    ['a wrong session field', { searchQuery: 7 as unknown as string }],
    ['one bad field beside a good one', { filters: ['epic'], minimumLevel: Number.NaN }],
  ])('rejects a save with %s, leaving cache, storage and listeners untouched', (_, input) => {
    const items = preferencesFamily('items')
    items.save({ filters: ['rare'], minimumLevel: 12, searchQuery: 'ring' })
    const snapshotBefore = items.snapshot()
    const preferencesTextBefore = localStorage.getItem(PREFERENCES_KEY)
    const tabStateTextBefore = sessionStorage.getItem(TAB_STATE_KEY)
    const listener = vi.fn()
    items.subscribe(listener)

    expect(items.save(input)).toBe(false)

    expect(items.snapshot()).toBe(snapshotBefore)
    expect(localStorage.getItem(PREFERENCES_KEY)).toBe(preferencesTextBefore)
    expect(sessionStorage.getItem(TAB_STATE_KEY)).toBe(tabStateTextBefore)
    expect(listener).not.toHaveBeenCalled()
  })

  it('rejects a text value the validator refuses and keeps the stored one', () => {
    nameValue.save('Teal')
    expect(nameValue.save('Chartreuse' as 'Gold')).toBe(false)
    expect(nameValue.snapshot()).toBe('Teal')
    expect(localStorage.getItem('test:name')).toBe('Teal')
  })

  it('rejects a save whose validator throws and keeps the stored value', () => {
    const fragileValue = createPersistedValue<number>({
      storageArea: 'localStorage',
      storageKey: 'test:fragile',
      codec: 'json',
      defaultValue: 1,
      validatedValue: (candidate) => {
        if (candidate === 13) throw new Error('unlucky')
        return typeof candidate === 'number' ? candidate : undefined
      },
    })
    fragileValue.save(7)
    expect(fragileValue.save(13)).toBe(false)
    expect(fragileValue.snapshot()).toBe(7)
    expect(localStorage.getItem('test:fragile')).toBe('7')
  })

  it('keeps a null that the validator returns, in the cache and across a reload', () => {
    const nullableValue = createPersistedValue<string | null>({
      storageArea: 'localStorage',
      storageKey: 'test:nullable',
      codec: 'json',
      defaultValue: 'fallback',
      validatedValue: (candidate) =>
        candidate === null || typeof candidate === 'string' ? candidate : undefined,
    })
    expect(nullableValue.save(null)).toBe(true)
    expect(nullableValue.snapshot()).toBeNull()
    expect(localStorage.getItem('test:nullable')).toBe('null')
    reload()
    expect(nullableValue.snapshot()).toBeNull()
  })

  it('returns true when every attempted write succeeded', () => {
    expect(preferencesFamily('items').save({ filters: ['rare'], searchQuery: 'ring' })).toBe(true)
  })

  it('writes only the areas that hold a changed field', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const items = preferencesFamily('items')
    items.save({ searchQuery: 'ring' })
    expect(setItem.mock.calls.map(([key]) => key)).toEqual([TAB_STATE_KEY])
    setItem.mockClear()
    items.save({ filters: ['rare'] })
    expect(setItem.mock.calls.map(([key]) => key)).toEqual([PREFERENCES_KEY])
  })

  it('keeps the other area byte-identical', () => {
    const items = preferencesFamily('items')
    items.save({ filters: ['rare'], searchQuery: 'ring' })
    const preferencesText = localStorage.getItem(PREFERENCES_KEY)
    items.save({ searchQuery: 'helm' })
    expect(localStorage.getItem(PREFERENCES_KEY)).toBe(preferencesText)
  })

  it('keeps each family key independent', () => {
    preferencesFamily('items').save({ filters: ['rare'] })
    preferencesFamily('feats').save({ filters: ['epic'] })
    expect(preferencesFamily('items').snapshot().filters).toEqual(['rare'])
    expect(preferencesFamily('feats').snapshot().filters).toEqual(['epic'])
    expect(localStorage.getItem('test:preferences:feats')).not.toBeNull()
  })

  it('keeps a value family keyed by its own storage key', () => {
    seenFamily('a').save(true)
    expect(seenFamily('a').snapshot()).toBe(true)
    expect(seenFamily('b').snapshot()).toBe(false)
    expect(sessionStorage.getItem('test:seen:a')).toBe('true')
  })
})

describe('snapshots', () => {
  it('returns the same reference across reads, and a family returns one state per key', () => {
    const items = preferencesFamily('items')
    expect(items.snapshot()).toBe(items.snapshot())
    expect(preferencesFamily('items')).toBe(items)
    expect(preferencesFamily('feats')).not.toBe(items)
    expect(seenFamily('a')).toBe(seenFamily('a'))
  })

  it('keeps the references of fields a save did not change', () => {
    const items = preferencesFamily('items')
    items.save({ filters: ['rare'], minimumLevel: 3 })
    const before = items.snapshot()
    items.save({ minimumLevel: 4 })
    const after = items.snapshot()
    expect(after).not.toBe(before)
    expect(after.filters).toBe(before.filters)
  })

  it('does not read storage until the first snapshot', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const lazyValue = createPersistedValue<boolean>({
      storageArea: 'localStorage',
      storageKey: 'test:lazy',
      codec: 'json',
      defaultValue: true,
      validatedValue: (candidate) => (typeof candidate === 'boolean' ? candidate : undefined),
    })
    expect(getItem).not.toHaveBeenCalled()
    lazyValue.snapshot()
    expect(getItem).toHaveBeenCalledWith('test:lazy')
  })
})

describe('subscription', () => {
  it('notifies only the listeners of the family key that was saved', () => {
    const itemsListener = vi.fn()
    const featsListener = vi.fn()
    const stopItems = preferencesFamily('items').subscribe(itemsListener)
    const stopFeats = preferencesFamily('feats').subscribe(featsListener)
    preferencesFamily('items').save({ filters: ['rare'] })
    expect(itemsListener).toHaveBeenCalledOnce()
    expect(featsListener).not.toHaveBeenCalled()
    stopItems()
    stopFeats()
  })

  it('stops notifying after unsubscribing', () => {
    const listener = vi.fn()
    const stop = flagValue.subscribe(listener)
    stop()
    flagValue.save(false)
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('resetPersistedStateForTests', () => {
  it('forgets cached snapshots, notifies listeners and leaves storage and listeners alone', () => {
    const listener = vi.fn()
    const stop = flagValue.subscribe(listener)
    flagValue.save(false)
    listener.mockClear()
    localStorage.setItem('test:flag', 'true')
    reload()
    expect(listener).toHaveBeenCalledOnce()
    expect(flagValue.snapshot()).toBe(true)
    expect(localStorage.getItem('test:flag')).toBe('true')
    flagValue.save(false)
    expect(listener).toHaveBeenCalledTimes(2)
    stop()
  })
})

describe('storage that refuses access', () => {
  function stubStorageGlobalThrowing(): void {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
  }

  function stubStorageMethodsThrowing(): void {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
  }

  it.each([
    ['methods throw', stubStorageMethodsThrowing],
    ['the storage global throws', stubStorageGlobalThrowing],
  ])(
    'gives defaults, a setter that does not throw and a cache that holds the save when %s',
    (_, stub) => {
      stub()
      const items = preferencesFamily('items')
      expect(items.snapshot()).toEqual({ filters: [], minimumLevel: 1, searchQuery: '' })
      expect(flagValue.snapshot()).toBe(true)
      expect(seenFamily('a').snapshot()).toBe(false)
      expect(items.save({ filters: ['rare'], searchQuery: 'ring' })).toBe(false)
      expect(flagValue.save(false)).toBe(false)
      expect(seenFamily('a').save(true)).toBe(false)
      expect(items.snapshot()).toMatchObject({ filters: ['rare'], searchQuery: 'ring' })
      expect(flagValue.snapshot()).toBe(false)
      expect(seenFamily('a').snapshot()).toBe(true)
    },
  )

  it('returns false when only one of two areas refuses the write', () => {
    const realSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === TAB_STATE_KEY) throw new DOMException('full', 'QuotaExceededError')
      realSetItem.call(this, key, value)
    })
    expect(preferencesFamily('items').save({ filters: ['rare'], searchQuery: 'ring' })).toBe(false)
    expect(localStorage.getItem(PREFERENCES_KEY)).not.toBeNull()
  })
})
