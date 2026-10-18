import { apiDetailPath, type Slug } from '../../../lib/api'
import { assertApiResponseFields, fetchApiJson, type ApiQuestDetail } from '../../../lib/api'

export interface QuestDetail {
  slug: Slug
  name: string
  pack: string | null
  patron: string | null
  level: number | null
  epicLevel: number | null
  isRaid: boolean
  items: Array<{ slug: Slug; name: string; slot: string; minimumLevel: number | null }>
}

export function toQuestDetail(
  apiQuest: ApiQuestDetail,
  path = apiDetailPath('quests', apiQuest?.slug),
): QuestDetail {
  assertApiResponseFields(apiQuest, path, { slug: 'string', name: 'string', items: 'array' })
  return {
    slug: apiQuest.slug,
    name: apiQuest.name,
    pack: apiQuest.pack,
    patron: apiQuest.patron,
    level: apiQuest.level,
    epicLevel: apiQuest.epic_level,
    isRaid: apiQuest.is_raid,
    items: apiQuest.items.map((item) => ({
      slug: item.slug,
      name: item.name,
      slot: item.slot,
      minimumLevel: item.minimum_level,
    })),
  }
}

export async function fetchQuest(slug: Slug): Promise<QuestDetail> {
  const path = apiDetailPath('quests', slug)
  return toQuestDetail(await fetchApiJson<ApiQuestDetail>(path), path)
}
