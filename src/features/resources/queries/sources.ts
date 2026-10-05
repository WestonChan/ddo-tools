import {
  assertApiResponseFields,
  fetchApiJson,
  type ApiSourceItem,
  type ApiSourceQuest,
  type ApiAdventurePackDetail,
  type ApiQuestSeriesDetail,
  type ApiCraftingSystemDetail,
  type ApiVendorDetail,
  type ApiEventDetail,
} from '../../../lib/api'

export interface SourceItem {
  id: number
  name: string
  slot: string
}

export interface SourceQuest {
  id: number
  name: string
  level: number | null
}

export interface SourceRecipe {
  name: string
  outputs: string[]
}

export type SourceDetailKind =
  'adventurePack' | 'questChain' | 'saga' | 'craftingSystem' | 'vendor' | 'event'

export interface SourceDetail {
  kind: SourceDetailKind
  id: number
  name: string
  pack: string | null
  isFreeToPlay: boolean | null
  npc: string | null
  location: string | null
  ingredientCount: number | null
  items: SourceItem[]
  quests: SourceQuest[]
  recipes: SourceRecipe[]
}

function sourceDetail(kind: SourceDetailKind, id: number, name: string): SourceDetail {
  return {
    kind,
    id,
    name,
    pack: null,
    isFreeToPlay: null,
    npc: null,
    location: null,
    ingredientCount: null,
    items: [],
    quests: [],
    recipes: [],
  }
}

function sourceItems(items: ApiSourceItem[]): SourceItem[] {
  return items.map(({ id, name, slot }) => ({ id, name, slot }))
}

function sourceQuests(quests: ApiSourceQuest[]): SourceQuest[] {
  return quests.map(({ id, name, level }) => ({ id, name, level }))
}

export function toAdventurePack(
  response: ApiAdventurePackDetail,
  path = `/v1/adventure-packs/${response?.id ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, { id: 'number', name: 'string', items: 'array' })
  return {
    ...sourceDetail('adventurePack', response.id, response.name),
    isFreeToPlay: response.is_free_to_play,
    items: sourceItems(response.items),
  }
}

export function toQuestChain(
  response: ApiQuestSeriesDetail,
  path = `/v1/quest-chains/${response?.id ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, {
    id: 'number',
    name: 'string',
    quests: 'array',
    rewards: 'array',
  })
  return {
    ...sourceDetail('questChain', response.id, response.name),
    pack: response.pack,
    quests: sourceQuests(response.quests),
    items: sourceItems(response.rewards),
  }
}

export function toSaga(
  response: ApiQuestSeriesDetail,
  path = `/v1/sagas/${response?.id ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, {
    id: 'number',
    name: 'string',
    quests: 'array',
    rewards: 'array',
  })
  return {
    ...sourceDetail('saga', response.id, response.name),
    pack: response.pack,
    quests: sourceQuests(response.quests),
    items: sourceItems(response.rewards),
  }
}

export function toCraftingSystem(
  response: ApiCraftingSystemDetail,
  path = `/v1/crafting-systems/${response?.id ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, { id: 'number', name: 'string', recipes: 'array' })
  response.recipes.forEach((recipe, index) => {
    assertApiResponseFields(recipe, path, { augments: 'array' }, `recipes[${index}].`)
  })
  return {
    ...sourceDetail('craftingSystem', response.id, response.name),
    pack: response.pack,
    npc: response.npc,
    ingredientCount: response.ingredient_count,
    recipes: response.recipes.map((recipe) => ({
      name: recipe.option,
      outputs: recipe.augments.map((augment) => augment.name),
    })),
  }
}

export function toVendor(
  response: ApiVendorDetail,
  path = `/v1/vendors/${response?.id ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, { id: 'number', name: 'string', items: 'array' })
  return {
    ...sourceDetail('vendor', response.id, response.name),
    pack: response.pack,
    location: response.location,
    items: sourceItems(response.items),
  }
}

export function toEvent(
  response: ApiEventDetail,
  path = `/v1/events/${response?.id ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, { id: 'number', name: 'string', items: 'array' })
  return {
    ...sourceDetail('event', response.id, response.name),
    items: sourceItems(response.items),
  }
}

export async function fetchAdventurePack(id: number): Promise<SourceDetail> {
  const path = `/v1/adventure-packs/${id}`
  return toAdventurePack(await fetchApiJson<ApiAdventurePackDetail>(path), path)
}

export async function fetchQuestChain(id: number): Promise<SourceDetail> {
  const path = `/v1/quest-chains/${id}`
  return toQuestChain(await fetchApiJson<ApiQuestSeriesDetail>(path), path)
}

export async function fetchSaga(id: number): Promise<SourceDetail> {
  const path = `/v1/sagas/${id}`
  return toSaga(await fetchApiJson<ApiQuestSeriesDetail>(path), path)
}

export async function fetchCraftingSystem(id: number): Promise<SourceDetail> {
  const path = `/v1/crafting-systems/${id}`
  return toCraftingSystem(await fetchApiJson<ApiCraftingSystemDetail>(path), path)
}

export async function fetchVendor(id: number): Promise<SourceDetail> {
  const path = `/v1/vendors/${id}`
  return toVendor(await fetchApiJson<ApiVendorDetail>(path), path)
}

export async function fetchEvent(id: number): Promise<SourceDetail> {
  const path = `/v1/events/${id}`
  return toEvent(await fetchApiJson<ApiEventDetail>(path), path)
}
