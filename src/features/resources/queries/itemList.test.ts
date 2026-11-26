import { slugFromPathSegment, WHOLE_LIST_PAGE_LIMIT, type ApiItemRow } from '../../../lib/api'
import { describe, expect, it, afterEach, vi } from 'vitest'
import {
  EMPTY_ITEM_FILTERS,
  itemListParameters,
  fetchItemPage,
  ITEM_LIST_FILTERS,
  declaredItemFilters,
  type ItemListFilters,
} from './itemList'
import { QueryClient } from '@tanstack/react-query'
import { MATCHABLE_ITEM_FILTER_PARAMETERS } from '../../../lib/api/itemListParameters'
import abilities from './fixtures/weapon-abilities.json'
import materials from './fixtures/item-materials.json'
import sockets from './fixtures/augment-slot-types-filter-families.json'
import crafting from './fixtures/crafting-systems.json'
import slots from './fixtures/equipment-slots.json'
import packs from '../../../lib/api/fixtures/adventure-packs.json'
import raids from './fixtures/quests-page-raid-and-quest.json'
import sets from './fixtures/sets-null-icon-page.json'
import effects from './fixtures/effects-page.json'
import openapi from '../../../lib/api/openapi/v1.json'

describe('item list filters', () => {
  it.each([
    ['attackAbility', 'attack_ability', 'Dexterity'],
    ['damageAbility', 'damage_ability', 'Charisma'],
    ['material', 'material', 'Steel'],
    ['socket', 'socket', 'red'],
    ['craftingSystem', 'crafting_system', 'thunder-forged'],
    ['pack', 'pack', 'Ravenloft'],
    ['raid', 'quest', 'caught-in-the-web'],
  ] as const)('sends %s through its API parameter', (key, parameter, value) => {
    expect(itemListParameters({ ...EMPTY_ITEM_FILTERS, [key]: [value] }, '', false)).toHaveProperty(
      parameter,
      [value],
    )
  })
})

afterEach(() => vi.restoreAllMocks())

const vocabularyResponses = {
  slot: slots,
  bonuses: effects,
  set: sets,
  attackAbility: abilities,
  damageAbility: abilities,
  material: materials,
  socket: sockets,
  pack: packs,
  raid: raids,
  craftingSystem: crafting,
}

const vocabularyContractExemptions: Readonly<
  Record<
    string,
    {
      reason: string
      valuesWithoutVocabulary?: readonly string[]
      isOfferedRow?: (row: Record<string, unknown>) => boolean
    }
  >
> = {
  bonus: {
    reason: 'The API exempts bonus: it resolves names, aliases and stat:bonus type values.',
    valuesWithoutVocabulary: effects.effects.map((row) => row.name),
  },
  quest: {
    reason:
      'Raid selects is_raid rows locally until WestonChan/ddo-data#106 adds a raid query parameter and WestonChan/ddo-tools#156 adopts it.',
    isOfferedRow: (row) => row.is_raid === true,
  },
}

describe('ITEM_LIST_FILTERS and declaredItemFilters', () => {
  it('declares one chip per multi-value field in table order with its parameter matchability', () => {
    const declarations = declaredItemFilters({ canListWeapons: true }).filter(
      (row) => row.kind === 'multi',
    )
    expect(declarations.map((row) => row.key)).toEqual(Object.keys(ITEM_LIST_FILTERS))
    expect(Object.keys(ITEM_LIST_FILTERS).sort()).toEqual(
      Object.entries(EMPTY_ITEM_FILTERS)
        .filter(([, value]) => Array.isArray(value))
        .map(([key]) => key)
        .sort(),
    )
    for (const declaration of declarations) {
      const entry = ITEM_LIST_FILTERS[declaration.key]
      expect(entry.matchKey !== null).toBe(
        MATCHABLE_ITEM_FILTER_PARAMETERS.some((parameter) => parameter === entry.parameter),
      )
      expect(declaration.matchKey).toBe(entry.matchKey ?? undefined)
      expect(declaration.label).toBe(entry.label)
      expect(declaration.optionSource).toBe(entry.optionSource)
    }
  })

  it.each(Object.entries(ITEM_LIST_FILTERS))(
    'serializes %s values and only active All modes',
    (key, entry) => {
      const values = { ...EMPTY_ITEM_FILTERS, [key]: ['first', 'second'] }
      const any = itemListParameters(values, '', false)
      expect(any[entry.parameter]).toEqual(['first', 'second'])
      expect(any[entry.parameter + '_match']).toBeUndefined()
      if (entry.matchKey) values[entry.matchKey] = 'all'
      const all = itemListParameters(values, '', false)
      expect(all[entry.parameter + '_match']).toBe(entry.matchKey ? 'all' : undefined)
      expect(
        itemListParameters({ ...values, [key]: [] }, '', false)[entry.parameter],
      ).toBeUndefined()
      expect(
        itemListParameters({ ...values, [key]: [] }, '', false)[entry.parameter + '_match'],
      ).toBeUndefined()
    },
  )

  it.each([true, false])(
    'gates chips and requests together when weapons can be listed: %s',
    (canListWeapons) => {
      const scope = { canListWeapons }
      const values = { ...EMPTY_ITEM_FILTERS } as ItemListFilters
      for (const key of Object.keys(ITEM_LIST_FILTERS) as Array<keyof typeof ITEM_LIST_FILTERS>)
        values[key] = ['selected']
      const parameters = itemListParameters(values, '', false, 0, null, scope)
      const keys = declaredItemFilters(scope).map((row) => row.key)
      for (const [key, entry] of Object.entries(ITEM_LIST_FILTERS)) {
        const isVisible = canListWeapons || !entry.isWeaponOnly
        expect(keys.includes(key as keyof ItemListFilters)).toBe(isVisible)
        expect(parameters[entry.parameter]).toEqual(isVisible ? ['selected'] : undefined)
      }
    },
  )

  it.each(Object.entries(ITEM_LIST_FILTERS))(
    'loads every %s option in served order through the API vocabulary contract',
    async (key, entry) => {
      const capture = vocabularyResponses[key as keyof typeof vocabularyResponses]
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(capture)))
      const client = new QueryClient()
      const vocabulary = await client.fetchQuery(entry.optionSource.queryOptions(''))
      const optionSet = entry.optionSource.toOptionSet({
        shown: vocabulary,
        unsearched: vocabulary,
        values: EMPTY_ITEM_FILTERS,
      })
      const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]))
      expect([[], ['0']]).toContainEqual(url.searchParams.getAll('offset'))
      const { request } = entry.optionSource
      for (const [input] of vi.mocked(fetch).mock.calls) {
        const requestedUrl = new URL(String(input))
        expect(requestedUrl.pathname).toBe(request.path)
        expect(requestedUrl.searchParams.getAll('q')).toEqual([])
        expect(requestedUrl.searchParams.getAll('limit')).toEqual([String(WHOLE_LIST_PAGE_LIMIT)])
        expect(
          [...requestedUrl.searchParams.keys()].filter(
            (name) =>
              !Object.hasOwn(request.parameters, name) && !['limit', 'offset', 'q'].includes(name),
          ),
        ).toEqual([])
        for (const [name, value] of Object.entries(request.parameters))
          expect(requestedUrl.searchParams.getAll(name)).toEqual(
            Array.isArray(value) ? value : [String(value)],
          )
      }
      const exemption = vocabularyContractExemptions[entry.parameter]
      const optionValues = optionSet.options.map((option) => option.value)
      if (exemption?.valuesWithoutVocabulary) {
        expect(optionValues, exemption.reason).toEqual(exemption.valuesWithoutVocabulary)
      } else {
        const parameter = openapi.paths['/v1/items'].get.parameters.find(
          (parameter) => parameter.in === 'query' && parameter.name === entry.parameter,
        )
        if (!parameter || !('x-vocabulary' in parameter))
          throw new Error(`Missing API vocabulary for ${entry.parameter}`)
        const vocabulary = parameter['x-vocabulary']
        if (!vocabulary?.route || !vocabulary.rows_key || !vocabulary.value_key)
          throw new Error(`Missing API vocabulary route or columns for ${entry.parameter}`)
        expect(request.path).toBe(vocabulary.route)
        const parameters = vocabulary.parameters ?? {}
        expect(request.parameters).toMatchObject(parameters)
        for (const [name, value] of Object.entries(parameters))
          expect(url.searchParams.getAll(name)).toEqual([value])
        const valueKey = vocabulary.value_key
        const rows = (capture as Record<string, unknown>)[vocabulary.rows_key] as Record<
          string,
          unknown
        >[]
        expect(Array.isArray(rows)).toBe(true)
        expect(rows.every((row) => typeof row[valueKey] === 'string')).toBe(true)
        const isOfferedRow = exemption?.isOfferedRow
        const offeredRows = isOfferedRow ? rows.filter(isOfferedRow) : rows
        if (isOfferedRow) {
          expect(offeredRows.length, exemption?.reason).toBeGreaterThan(0)
          expect(offeredRows.length, exemption?.reason).toBeLessThan(rows.length)
          for (const row of rows.filter((row) => !isOfferedRow(row)))
            expect(optionValues, exemption?.reason).not.toContain(row[valueKey])
        }
        expect(optionValues, exemption?.reason).toEqual(offeredRows.map((row) => row[valueKey]))
      }
      expect(
        entry.optionSource.toOptionSet({
          shown: undefined,
          unsearched: undefined,
          values: EMPTY_ITEM_FILTERS,
        }).options,
      ).toEqual([])
      if (key === 'attackAbility' || key === 'damageAbility') {
        expect(entry.shouldPreserveOptionOrder).toBe(true)
        expect(optionSet.options.map((option) => option.caption)).toEqual(
          abilities.weapon_abilities.map((row) =>
            String(key === 'attackAbility' ? row.attack_item_count : row.damage_item_count),
          ),
        )
      }
      if (key === 'material')
        expect(optionSet.options.map((option) => option.caption)).toEqual(
          materials.item_materials.map((row) => String(row.item_count)),
        )
      if (key === 'socket')
        expect(optionSet.options.map((option) => option.caption)).toEqual(
          sockets.augment_slot_types.map((row) => row.family + ' · ' + row.item_count),
        )
      if (key === 'craftingSystem')
        expect(optionSet.options.map((option) => option.caption)).toEqual(
          crafting.crafting_systems.map((row) => String(row.item_count)),
        )
      if (key === 'bonuses') {
        expect(optionSet.optionCount).toBe(effects.total)
        expect(
          optionSet.options.map((option) => option.children?.map((child) => child.caption)),
        ).toEqual(
          effects.effects.map((row) =>
            row.kind === 'stat'
              ? row.bonus_types.map((bonus) => String(bonus.item_count))
              : undefined,
          ),
        )
        for (const row of effects.effects)
          for (const bonus of row.bonus_types)
            expect(optionSet.selectedOptionLabels?.get(row.name + ':' + bonus.name)).toBe(
              row.name + ' · ' + bonus.name,
            )
      }
      if (key === 'set') expect(optionSet.optionCount).toBe(sets.total)
      if (entry.optionSource.isServerSearched) {
        const withoutUnsearched = entry.optionSource.toOptionSet({
          shown: vocabulary,
          unsearched: undefined,
          values: EMPTY_ITEM_FILTERS,
        })
        expect(withoutUnsearched.optionCount).toBe(withoutUnsearched.options.length)
      }
      client.clear()
    },
  )
})

function createApiItemRow(overrides: Partial<ApiItemRow> = {}): ApiItemRow {
  return {
    slug: slugFromPathSegment('test-1')!,
    name: 'Bloodstone',
    sets: [],
    slot: 'Trinket',
    category: 'Jewelry',
    item_type: null,
    minimum_level: 12,
    enhancement_bonus: null,
    icon: 'Trinket_1',
    pack: 'Vault of Night',
    is_raid: true,
    is_rare: false,
    is_legacy: false,
    ...overrides,
  }
}

describe('item page requests', () => {
  function mockFetchResponse(responseBody: unknown): void {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(responseBody), { status: 200 })),
    )
  }

  it.each([
    ['name', 'asc', 'name'],
    ['ml', 'desc', '-minimum_level'],
    ['slot', 'asc', 'slot'],
    ['pack', 'asc', 'pack'],
    ['raid', 'asc', 'is_raid'],
    ['rare', 'desc', '-is_rare'],
  ] as const)(
    'sends the %s column sort as %s through the API',
    async (column, direction, apiField) => {
      mockFetchResponse({ total: 0, limit: 200, offset: 200, items: [] })
      await fetchItemPage(EMPTY_ITEM_FILTERS, '', false, 200, { key: column, direction })
      const parameters = new URL(vi.mocked(fetch).mock.calls[0][0] as string).searchParams
      expect(parameters.get('limit')).toBe('200')
      expect(parameters.get('offset')).toBe('200')
      expect(parameters.getAll('sort')).toEqual(
        apiField === 'name' ? [apiField] : [apiField, 'name'],
      )
      expect(parameters.has('order')).toBe(false)
    },
  )

  it('sends every active list filter in one items request and preserves the response total and order', async () => {
    mockFetchResponse({
      total: 202,
      limit: 200,
      offset: 200,
      items: [
        createApiItemRow({ slug: slugFromPathSegment('test-7')!, name: 'Torc' }),
        createApiItemRow({ slug: slugFromPathSegment('test-8')! }),
      ],
    })
    const page = await fetchItemPage(
      {
        ...EMPTY_ITEM_FILTERS,
        ml: { min: '20', max: '32' },
        slot: ['Back', 'Ring'],
        bonuses: ['Strength', 'Constitution:Insightful'],
        bonusMatch: 'all',
        set: ['Adherent of the Mists Set (Heroic)', 'Adherent of the Mists Set (Legendary)'],
        setMatch: 'all',
        pack: ['Shadowfell', 'Vault of Night'],
        raid: ['7', '8'],
        isRareOnly: true,
        isRaidOnly: false,
      },
      'torc',
      true,
      200,
    )
    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
    expect(
      Object.fromEntries(
        [...url.searchParams].filter(
          ([key]) => !['slot', 'pack', 'quest', 'bonus', 'set'].includes(key),
        ),
      ),
    ).toEqual({
      q: 'torc',
      min_level: '20',
      max_level: '32',
      bonus_match: 'all',
      set_match: 'all',
      include_set_bonuses: 'true',
      rare: 'true',
      limit: '200',
      offset: '200',
    })
    expect(url.searchParams.getAll('bonus')).toEqual(['Strength', 'Constitution:Insightful'])
    expect(url.searchParams.getAll('set')).toEqual([
      'Adherent of the Mists Set (Heroic)',
      'Adherent of the Mists Set (Legendary)',
    ])
    expect(url.searchParams.getAll('slot')).toEqual(['Back', 'Ring'])
    expect(url.searchParams.getAll('pack')).toEqual(['Shadowfell', 'Vault of Night'])
    expect(url.searchParams.getAll('quest')).toEqual(['7', '8'])
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
    expect(page.total).toBe(202)
    expect(page.items.map((item) => item.name)).toEqual(['Torc', 'Bloodstone'])
  })

  it('removes cleared filters from the request', async () => {
    mockFetchResponse({
      total: 1,
      limit: 200,
      offset: 0,
      items: [createApiItemRow({ slug: slugFromPathSegment('test-5')! })],
    })
    const page = await fetchItemPage(
      {
        ...EMPTY_ITEM_FILTERS,
        ml: { min: '', max: '' },
        slot: [],
        bonuses: [],
        bonusMatch: 'any',
        set: [],
        setMatch: 'any',
        pack: ['Reign of Madness'],
        raid: [],
        isRareOnly: false,
        isRaidOnly: true,
      },
      '  ',
      true,
    )
    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      pack: 'Reign of Madness',
      raid: 'true',
      limit: '200',
      offset: '0',
    })
    expect(page.items[0].pack).toBe('Vault of Night')
  })

  it('omits the match parameter in Any mode while keeping repeated bonuses', async () => {
    mockFetchResponse({ total: 0, limit: 200, offset: 0, items: [] })
    await fetchItemPage({ ...EMPTY_ITEM_FILTERS, bonuses: ['Strength', 'Vorpal'] }, '', false)
    const parameters = new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams
    expect(parameters.getAll('bonus')).toEqual(['Strength', 'Vorpal'])
    expect(parameters.has('bonus_match')).toBe(false)
  })

  it('omits All mode until a bonus is selected', async () => {
    mockFetchResponse({ total: 0, limit: 200, offset: 0, items: [] })
    await fetchItemPage({ ...EMPTY_ITEM_FILTERS, bonusMatch: 'all' }, '', false)
    const parameters = new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams
    expect(parameters.has('bonus_match')).toBe(false)
    expect(parameters.has('bonus')).toBe(false)
  })
  it('rejects a wrong list key with a tagged API error', async () => {
    mockFetchResponse({ total: 0, limit: 200, offset: 0, augments: [] })
    await expect(fetchItemPage(EMPTY_ITEM_FILTERS, '', false)).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'api-response',
    })
  })
})
