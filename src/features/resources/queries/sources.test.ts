import { afterEach, describe, expect, it, vi } from 'vitest'
import adventurePack from './fixtures/adventure-packs.json'
import questChain from './fixtures/quest-chains.json'
import saga from './fixtures/sagas.json'
import craftingSystem from './fixtures/crafting-systems.json'
import vendor from './fixtures/vendors.json'
import event from './fixtures/events.json'
import {
  toAdventurePack,
  toQuestChain,
  toSaga,
  toCraftingSystem,
  toVendor,
  toEvent,
  fetchAdventurePack,
  fetchQuestChain,
  fetchSaga,
  fetchCraftingSystem,
  fetchVendor,
  fetchEvent,
} from './sources'

afterEach(() => vi.restoreAllMocks())

describe('captured source detail responses', () => {
  it('reports a malformed source list with its path and field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ...adventurePack, items: null })),
    )
    await expect(fetchAdventurePack(2)).rejects.toMatchObject({
      kind: 'api-response',
      message: expect.stringContaining('/v1/adventure-packs/2: items'),
    })
  })
  it('maps a pack and its yielded items', () => {
    const pack = toAdventurePack(adventurePack)
    expect(pack).toMatchObject({
      kind: 'adventurePack',
      name: 'Magic of Myth Drannor',
      isFreeToPlay: false,
    })
    expect(pack.items[0]).toEqual({
      id: 794,
      name: 'Bastard Sword of the Fallen Age',
      slot: 'Main Hand',
    })
    expect(pack.items).toHaveLength(adventurePack.items.length)
  })

  it('maps a quest chain with quests and rewards', () => {
    const chain = toQuestChain(questChain)
    expect(chain).toMatchObject({ kind: 'questChain', name: 'The Lost Seekers' })
    expect(chain.quests[0]).toEqual({ id: 47, name: "The Kobold's Den: Clan Gnashtooth", level: 3 })
    expect(chain.items[0]).toEqual({ id: 468, name: "Acrobat's Ring", slot: 'Ring' })
    expect(chain.items).toHaveLength(questChain.rewards.length)
  })

  it('maps a saga with its pack, quests and rewards', () => {
    const mappedSaga = toSaga(saga)
    expect(mappedSaga).toMatchObject({
      kind: 'saga',
      name: 'The Haunting of Saltmarsh',
      pack: 'Sinister Secret of Saltmarsh',
    })
    expect(mappedSaga.quests[0]).toEqual({ id: 60, name: 'Back to Basics', level: 3 })
    expect(mappedSaga.items[0]).toEqual({ id: 891, name: 'Black Pearl Ring', slot: 'Ring' })
    expect(mappedSaga.items).toHaveLength(saga.rewards.length)
  })

  it('maps crafting recipes and ingredient count', () => {
    const system = toCraftingSystem(craftingSystem)
    expect(system).toMatchObject({
      kind: 'craftingSystem',
      name: 'Slave Lords Crafting',
      ingredientCount: 16,
    })
    expect(system.recipes[0]).toEqual({
      name: 'Attributes +5',
      outputs: ['Strength +5', 'Intelligence +5', 'Dexterity +5'],
    })
    expect(system.recipes).toHaveLength(craftingSystem.recipes.length)
  })

  it('maps a vendor with location and items', () => {
    const mappedVendor = toVendor(vendor)
    expect(mappedVendor).toMatchObject({
      kind: 'vendor',
      name: 'Morten Edgewright',
      location: 'The Keep on the Borderlands',
    })
    expect(mappedVendor.items[0]).toEqual({
      id: 2428,
      name: 'Epic Ethereal Bastard Sword',
      slot: 'Main Hand',
    })
    expect(mappedVendor.items).toHaveLength(vendor.items.length)
  })

  it('maps an event and its items', () => {
    const mappedEvent = toEvent(event)
    expect(mappedEvent).toMatchObject({ kind: 'event', name: 'Treasure of Crystal Cove' })
    expect(mappedEvent.items[0]).toEqual({ id: 484, name: "Admiral's Tricorne", slot: 'Head' })
    expect(mappedEvent.items).toHaveLength(event.items.length)
  })
})

it.each([
  [fetchAdventurePack, '/v1/adventure-packs/2', adventurePack, 2],
  [fetchQuestChain, '/v1/quest-chains/1', questChain, 1],
  [fetchSaga, '/v1/sagas/1', saga, 1],
  [fetchCraftingSystem, '/v1/crafting-systems/1', craftingSystem, 1],
  [fetchVendor, '/v1/vendors/1', vendor, 1],
  [fetchEvent, '/v1/events/1', event, 1],
] as const)('fetches and maps %s by id', async (fetchSource, path, response, id) => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }))
  const source = await fetchSource(id)
  expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(path)
  expect(source.id).toBe(id)
})
