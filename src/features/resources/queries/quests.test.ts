import { expect, it } from 'vitest'
import { toQuestDetail } from './quests'

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
