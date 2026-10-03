import {
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

export function toAdventurePack(response: ApiAdventurePackDetail): SourceDetail {
  return {
    ...sourceDetail('adventurePack', response.id, response.name),
    isFreeToPlay: response.is_free_to_play,
    items: sourceItems(response.items),
  }
}

export function toQuestChain(response: ApiQuestSeriesDetail): SourceDetail {
  return {
    ...sourceDetail('questChain', response.id, response.name),
    pack: response.pack,
    quests: sourceQuests(response.quests),
    items: sourceItems(response.rewards),
  }
}

export function toSaga(response: ApiQuestSeriesDetail): SourceDetail {
  return {
    ...sourceDetail('saga', response.id, response.name),
    pack: response.pack,
    quests: sourceQuests(response.quests),
    items: sourceItems(response.rewards),
  }
}

export function toCraftingSystem(response: ApiCraftingSystemDetail): SourceDetail {
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

export function toVendor(response: ApiVendorDetail): SourceDetail {
  return {
    ...sourceDetail('vendor', response.id, response.name),
    pack: response.pack,
    location: response.location,
    items: sourceItems(response.items),
  }
}

export function toEvent(response: ApiEventDetail): SourceDetail {
  return {
    ...sourceDetail('event', response.id, response.name),
    items: sourceItems(response.items),
  }
}

export async function fetchAdventurePack(id: number): Promise<SourceDetail> {
  return toAdventurePack(await fetchApiJson<ApiAdventurePackDetail>(`/v1/adventure-packs/${id}`))
}

export async function fetchQuestChain(id: number): Promise<SourceDetail> {
  return toQuestChain(await fetchApiJson<ApiQuestSeriesDetail>(`/v1/quest-chains/${id}`))
}

export async function fetchSaga(id: number): Promise<SourceDetail> {
  return toSaga(await fetchApiJson<ApiQuestSeriesDetail>(`/v1/sagas/${id}`))
}

export async function fetchCraftingSystem(id: number): Promise<SourceDetail> {
  return toCraftingSystem(await fetchApiJson<ApiCraftingSystemDetail>(`/v1/crafting-systems/${id}`))
}

export async function fetchVendor(id: number): Promise<SourceDetail> {
  return toVendor(await fetchApiJson<ApiVendorDetail>(`/v1/vendors/${id}`))
}

export async function fetchEvent(id: number): Promise<SourceDetail> {
  return toEvent(await fetchApiJson<ApiEventDetail>(`/v1/events/${id}`))
}
