import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ItemDetail } from './ItemDetail'
import type { ItemDetail as ItemDetailRow } from '../../queries/items'

afterEach(() => {
  cleanup()
})

const baseDetail: ItemDetailRow = {
  id: 42,
  name: 'Voice of the Master',
  rarity: null,
  equipment_slot: 'Trinket',
  item_category: null,
  minimum_level: 5,
  material: null,
  binding: null,
  tooltip: null,
  description: null,
  wiki_url: null,
  weaponStats: null,
  armorStats: null,
  augmentSlots: [],
  upgrades: [],
  bonuses: [],
  effects: [],
  spellLinks: [],
  quests: [],
}

describe('ItemDetail quest wiki links', () => {
  it('renders a wiki link icon next to each quest in Drops from', () => {
    render(
      <ItemDetail
        detail={{
          ...baseDetail,
          quests: [
            {
              quest_id: 7,
              name: "Delera's Tomb",
              patron: null,
              pack: null,
              zone: null,
              npc: null,
              level: 8,
              is_rare: false,
            },
          ],
        }}
      />,
    )
    const link = screen.getByRole('link', { name: "Open Delera's Tomb on DDO Wiki" })
    // No quests.wiki_url column yet (roadmap Phase 4c) — URL derives from
    // the name. encodeURIComponent leaves apostrophes literal; ddowiki
    // accepts them.
    expect(link).toHaveAttribute('href', "https://ddowiki.com/page/Delera's_Tomb")
  })

  // `quest_loot.is_rare` is mapping-level: the same item can be a rare drop in
  // one quest and a guaranteed reward in another, so the marker belongs on the
  // row rather than on the item header.
  it('marks a rare drop location with a chip on the quest name, not in the meta line', () => {
    const { container } = render(
      <ItemDetail
        detail={{
          ...baseDetail,
          quests: [
            {
              quest_id: 7,
              name: "Delera's Tomb",
              patron: 'The Free Agents',
              pack: null,
              zone: null,
              npc: null,
              level: 8,
              is_rare: true,
            },
          ],
        }}
      />,
    )
    // The chip modifies the drop location, so it lives on the name line —
    // same `data-kind` contract the picker rows use, so both panels render
    // the same fact identically.
    const chip = container.querySelector('.resources-quest-name .resources-chip[data-kind="rare"]')
    expect(chip).not.toBeNull()
    expect(chip).toHaveTextContent('Rare')
    // …and the `·`-joined meta line keeps only the where-to-go facts.
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(
      'The Free Agents · Level 8',
    )
    expect(screen.queryByText(/\(rare\)/)).toBeNull()
  })

  it('does not mark a non-rare drop location', () => {
    const { container } = render(
      <ItemDetail
        detail={{
          ...baseDetail,
          quests: [
            {
              quest_id: 7,
              name: "Delera's Tomb",
              patron: 'The Free Agents',
              pack: null,
              zone: null,
              npc: null,
              level: 8,
              is_rare: false,
            },
          ],
        }}
      />,
    )
    expect(container.querySelector('.resources-chip')).toBeNull()
    expect(screen.queryByText(/\(rare\)/)).toBeNull()
  })

  it('renders no quest links when the item drops from no quests', () => {
    render(<ItemDetail detail={baseDetail} />)
    expect(screen.queryByText('Drops from')).toBeNull()
  })
})
