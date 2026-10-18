import { apiDetailPath, type Slug } from '../../../lib/api'
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
import type { IngredientCost } from '../../../lib/ingredientCost'

export interface SourceItem {
  slug: Slug
  name: string
  slot: string
  minimumLevel: number | null
  isRareLoot: boolean
  chest: string | null
  price: IngredientCost[]
  tier: string | null
  pack: string | null
}

export interface SourceQuest {
  slug: Slug
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
  slug: Slug
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

function sourceDetail(kind: SourceDetailKind, slug: Slug, name: string): SourceDetail {
  return {
    kind,
    slug,
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
  return items.map((item) => ({
    slug: item.slug,
    name: item.name,
    slot: item.slot,
    minimumLevel: item.minimum_level ?? null,
    isRareLoot: item.is_rare ?? false,
    chest: item.chest ?? null,
    price: item.price ?? [],
    tier: item.tier ?? null,
    pack: item.pack ?? null,
  }))
}

function sourceQuests(quests: ApiSourceQuest[]): SourceQuest[] {
  return quests.map(({ slug, name, level }) => ({ slug, name, level }))
}

export function toAdventurePack(
  response: ApiAdventurePackDetail,
  path = `/v1/adventure-packs/${response?.slug ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, { slug: 'string', name: 'string', items: 'array' })
  return {
    ...sourceDetail('adventurePack', response.slug, response.name),
    isFreeToPlay: response.is_free_to_play,
    items: sourceItems(response.items),
  }
}

export function toQuestChain(
  response: ApiQuestSeriesDetail,
  path = `/v1/quest-chains/${response?.slug ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, {
    slug: 'string',
    name: 'string',
    quests: 'array',
    rewards: 'array',
  })
  return {
    ...sourceDetail('questChain', response.slug, response.name),
    pack: response.pack,
    quests: sourceQuests(response.quests),
    items: sourceItems(response.rewards),
  }
}

export function toSaga(
  response: ApiQuestSeriesDetail,
  path = `/v1/sagas/${response?.slug ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, {
    slug: 'string',
    name: 'string',
    quests: 'array',
    rewards: 'array',
  })
  return {
    ...sourceDetail('saga', response.slug, response.name),
    pack: response.pack,
    quests: sourceQuests(response.quests),
    items: sourceItems(response.rewards),
  }
}

export function toCraftingSystem(
  response: ApiCraftingSystemDetail,
  path = `/v1/crafting-systems/${response?.slug ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, { slug: 'string', name: 'string', recipes: 'array' })
  response.recipes.forEach((recipe, index) => {
    assertApiResponseFields(recipe, path, { augments: 'array' }, `recipes[${index}].`)
  })
  return {
    ...sourceDetail('craftingSystem', response.slug, response.name),
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
  path = `/v1/vendors/${response?.slug ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, { slug: 'string', name: 'string', items: 'array' })
  return {
    ...sourceDetail('vendor', response.slug, response.name),
    pack: response.pack,
    location: response.location,
    items: sourceItems(response.items),
  }
}

export function toEvent(
  response: ApiEventDetail,
  path = `/v1/events/${response?.slug ?? 'unknown'}`,
): SourceDetail {
  assertApiResponseFields(response, path, { slug: 'string', name: 'string', items: 'array' })
  return {
    ...sourceDetail('event', response.slug, response.name),
    items: sourceItems(response.items),
  }
}

export async function fetchAdventurePack(slug: Slug): Promise<SourceDetail> {
  const path = apiDetailPath('adventure-packs', slug)
  return toAdventurePack(await fetchApiJson<ApiAdventurePackDetail>(path), path)
}

export async function fetchQuestChain(slug: Slug): Promise<SourceDetail> {
  const path = apiDetailPath('quest-chains', slug)
  return toQuestChain(await fetchApiJson<ApiQuestSeriesDetail>(path), path)
}

export async function fetchSaga(slug: Slug): Promise<SourceDetail> {
  const path = apiDetailPath('sagas', slug)
  return toSaga(await fetchApiJson<ApiQuestSeriesDetail>(path), path)
}

export async function fetchCraftingSystem(slug: Slug): Promise<SourceDetail> {
  const path = apiDetailPath('crafting-systems', slug)
  return toCraftingSystem(await fetchApiJson<ApiCraftingSystemDetail>(path), path)
}

export async function fetchVendor(slug: Slug): Promise<SourceDetail> {
  const path = apiDetailPath('vendors', slug)
  return toVendor(await fetchApiJson<ApiVendorDetail>(path), path)
}

export async function fetchEvent(slug: Slug): Promise<SourceDetail> {
  const path = apiDetailPath('events', slug)
  return toEvent(await fetchApiJson<ApiEventDetail>(path), path)
}
