import { assertApiResponseFields, fetchApiJson, type ApiQuestDetail } from '../../../lib/api'

export interface QuestDetail {
  id: number
  name: string
  pack: string | null
  patron: string | null
  level: number | null
  epicLevel: number | null
  isRaid: boolean
  items: Array<{ id: number; name: string; slot: string; minimumLevel: number | null }>
}

export function toQuestDetail(
  apiQuest: ApiQuestDetail,
  path = `/v1/quests/${apiQuest?.id ?? 'unknown'}`,
): QuestDetail {
  assertApiResponseFields(apiQuest, path, { id: 'number', name: 'string', items: 'array' })
  return {
    id: apiQuest.id,
    name: apiQuest.name,
    pack: apiQuest.pack,
    patron: apiQuest.patron,
    level: apiQuest.level,
    epicLevel: apiQuest.epic_level,
    isRaid: apiQuest.is_raid,
    items: apiQuest.items.map((item) => ({
      id: item.id,
      name: item.name,
      slot: item.slot,
      minimumLevel: item.minimum_level,
    })),
  }
}

export async function fetchQuest(id: number): Promise<QuestDetail> {
  const path = `/v1/quests/${id}`
  return toQuestDetail(await fetchApiJson<ApiQuestDetail>(path), path)
}
