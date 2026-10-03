import { fetchApiJson, type ApiQuestDetail } from '../../../lib/api'

export interface QuestDetail {
  id: number
  name: string
  pack: string | null
  isRaid: boolean
  items: Array<{ id: number; name: string; slot: string; minimumLevel: number | null }>
}

export function toQuestDetail(apiQuest: ApiQuestDetail): QuestDetail {
  return {
    id: apiQuest.id,
    name: apiQuest.name,
    pack: apiQuest.pack,
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
  return toQuestDetail(await fetchApiJson<ApiQuestDetail>(`/v1/quests/${id}`))
}
