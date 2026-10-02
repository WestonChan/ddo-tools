import type { JSX } from 'react'
import { DropTagChip } from '../DropTagChip'
import { useAugmentLootQuests } from '../../queries/useItems'
import { sentenceCased } from './sentenceCased'

const SHOWN_LOOT_QUEST_COUNT = 3

export function AugmentLootQuestList({ augmentId }: { augmentId: number }): JSX.Element | null {
  const { data: lootQuests } = useAugmentLootQuests(augmentId)
  if (!lootQuests || lootQuests.length === 0) return null

  const hiddenLootQuestCount = lootQuests.length - SHOWN_LOOT_QUEST_COUNT
  return (
    <div className="resources-augment-loot-quests">
      <span className="resources-augment-loot-quests-heading">Drops in</span>
      <ul className="resources-augment-loot-quest-list">
        {lootQuests.slice(0, SHOWN_LOOT_QUEST_COUNT).map((quest) => (
          <li key={quest.id} className="resources-augment-loot-quest">
            {quest.name}
            {quest.isRareLoot && <DropTagChip kind="rare" />}
            {quest.chests.map((chest) => (
              <span key={chest} className="resources-quest-chest">
                {sentenceCased(chest)}
              </span>
            ))}
          </li>
        ))}
      </ul>
      {hiddenLootQuestCount > 0 && (
        <span className="resources-augment-loot-quests-more">+{hiddenLootQuestCount} more</span>
      )}
    </div>
  )
}
