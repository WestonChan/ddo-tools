import { afterEach, describe, expect, it, vi } from 'vitest'
import { slugFromPathSegment } from '../../../lib/api'
import { apiFixture } from '../../../test/apiFixture'
import adventurePackResponse from './fixtures/adventure-pack-magic-of-myth-drannor.json'
import questChainResponse from './fixtures/quest-chain-the-lost-seekers.json'
import sagaResponse from './fixtures/saga-the-haunting-of-saltmarsh.json'
import craftingSystemResponse from './fixtures/crafting-system-slave-lords-crafting.json'
import vendorResponse from '../../../test/fixtures/vendor-morten-edgewright.json'
import eventResponse from './fixtures/event-treasure-of-crystal-cove.json'
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

const adventurePack = apiFixture(adventurePackResponse)
const questChain = apiFixture(questChainResponse)
const saga = apiFixture(sagaResponse)
const craftingSystem = apiFixture(craftingSystemResponse)
const vendor = apiFixture(vendorResponse)
const event = apiFixture(eventResponse)

afterEach(() => vi.restoreAllMocks())

describe('captured source detail responses', () => {
  it('reports a malformed source list with its path and field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ...adventurePack, items: null })),
    )
    await expect(fetchAdventurePack(slugFromPathSegment('test-3')!)).rejects.toMatchObject({
      kind: 'api-response',
      message: expect.stringContaining('/v1/adventure-packs/test-3: items'),
    })
  })
  it('maps a pack and its yielded items', () => {
    const pack = toAdventurePack(adventurePack)
    expect(pack).toMatchObject({
      kind: 'adventurePack',
      name: 'Magic of Myth Drannor',
      isFreeToPlay: false,
    })
    expect(pack.items[0]).toMatchObject({
      slug: adventurePack.items[0].slug,
      name: 'Bastard Sword of the Fallen Age',
      slot: 'Main Hand',
      minimumLevel: 13,
      chest: 'any end chest',
      isRareLoot: false,
    })
    expect(pack.items).toHaveLength(adventurePack.items.length)
  })

  it('maps a quest chain with quests and rewards', () => {
    const chain = toQuestChain(questChain)
    expect(chain).toMatchObject({ kind: 'questChain', name: 'The Lost Seekers' })
    expect(chain.quests[0]).toEqual({
      slug: questChain.quests[0].slug,
      name: "The Kobold's Den: Clan Gnashtooth",
      level: 3,
    })
    expect(chain.items[0]).toMatchObject({
      slug: questChain.rewards[0].slug,
      name: "Acrobat's Ring",
      slot: 'Ring',
    })
    expect(chain.items).toHaveLength(questChain.rewards.length)
  })

  it('maps a saga with its pack, quests and rewards', () => {
    const mappedSaga = toSaga(saga)
    expect(mappedSaga).toMatchObject({
      kind: 'saga',
      name: 'The Haunting of Saltmarsh',
      pack: 'Sinister Secret of Saltmarsh',
    })
    expect(mappedSaga.quests[0]).toEqual({
      slug: saga.quests[0].slug,
      name: 'Back to Basics',
      level: 3,
    })
    expect(mappedSaga.items[0]).toMatchObject({
      slug: saga.rewards[0].slug,
      name: 'Black Pearl Ring',
      slot: 'Ring',
    })
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
      outputs: [
        'Charisma +5',
        'Constitution +5',
        'Dexterity +5',
        'Intelligence +5',
        'Strength +5',
        'Wisdom +5',
      ],
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
    expect(mappedVendor.items[0]).toMatchObject({
      slug: vendor.items[0].slug,
      name: 'Epic Ethereal Bastard Sword',
      slot: 'Main Hand',
      price: [{ ingredient: 'Epic Ethereal Ingot', quantity: 1 }],
    })
    expect(mappedVendor.items).toHaveLength(vendor.items.length)
  })

  it('maps an event and its items', () => {
    const mappedEvent = toEvent(event)
    expect(mappedEvent).toMatchObject({ kind: 'event', name: 'Treasure of Crystal Cove' })
    expect(mappedEvent.items[0]).toMatchObject({
      slug: event.items[0].slug,
      name: "Admiral's Tricorne",
      slot: 'Head',
    })
    expect(mappedEvent.items).toHaveLength(event.items.length)
  })
})

it.each([
  [
    fetchAdventurePack,
    `/v1/adventure-packs/${adventurePack.slug}`,
    adventurePack,
    adventurePack.slug,
  ],
  [fetchQuestChain, `/v1/quest-chains/${questChain.slug}`, questChain, questChain.slug],
  [fetchSaga, `/v1/sagas/${saga.slug}`, saga, saga.slug],
  [
    fetchCraftingSystem,
    `/v1/crafting-systems/${craftingSystem.slug}`,
    craftingSystem,
    craftingSystem.slug,
  ],
  [fetchVendor, `/v1/vendors/${vendor.slug}`, vendor, vendor.slug],
  [fetchEvent, `/v1/events/${event.slug}`, event, event.slug],
] as const)('fetches and maps %s by slug', async (fetchSource, path, response, slug) => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }))
  const source = await fetchSource(slug)
  expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(path)
  expect(source.slug).toBe(slug)
})

it('maps every Dragon Keeper ingredient in source order', () => {
  expect(toVendor(vendor).items.find((item) => item.name === 'The Dragon Keeper')).toMatchObject({
    price: [
      { ingredient: 'Ethereal Ingot', quantity: 1 },
      { ingredient: 'Arcane Ingot', quantity: 1 },
      { ingredient: 'Silver Ingot', quantity: 1 },
    ],
  })
})
