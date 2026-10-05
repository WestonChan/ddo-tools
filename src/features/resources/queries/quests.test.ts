import { expect, it, vi } from 'vitest'
import { fetchQuest, toQuestDetail } from './quests'

it('reports a missing quest item list with its path and field', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ id: 7, name: 'The Storm' })),
  )
  await expect(fetchQuest(7)).rejects.toMatchObject({
    kind: 'api-response',
    message: expect.stringContaining('/v1/quests/7: items'),
  })
  vi.restoreAllMocks()
})

it('maps quest loot to the resource domain shape', () => {
  const quest = toQuestDetail({
    id: 7,
    name: 'The Storm',
    pack: 'Storm Pack',
    is_raid: true,
    items: [
      {
        id: 11,
        name: 'Storm Blade',
        slot: 'Main Hand',
        minimum_level: 20,
        loot_type: 'chest',
        is_rare: false,
        chest: 'end chest',
      },
    ],
  })
  expect(quest.isRaid).toBe(true)
  expect(quest.items[0]).toEqual({
    id: 11,
    name: 'Storm Blade',
    slot: 'Main Hand',
    minimumLevel: 20,
  })
})
