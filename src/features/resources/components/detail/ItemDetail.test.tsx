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
  enhancement_bonus: null,
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

  it('renders no quest links when the item drops from no quests', () => {
    render(<ItemDetail detail={baseDetail} />)
    expect(screen.queryByText('Drops from')).toBeNull()
  })
})

describe('ItemDetail header attributes', () => {
  it('signs a positive enhancement bonus with +', () => {
    render(<ItemDetail detail={{ ...baseDetail, enhancement_bonus: 3 }} />)
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('renders a negative enhancement bonus with a single minus sign', () => {
    // Same defect class as the EnchantmentList "+-2" bug fixed on this
    // branch: an unconditional "+" prefix. No negative enhancement_bonus
    // exists in the shipped DB today, so this is a latent-regression guard.
    render(<ItemDetail detail={{ ...baseDetail, enhancement_bonus: -2 }} />)
    expect(screen.getByText('-2')).toBeInTheDocument()
    expect(screen.queryByText('+-2')).toBeNull()
  })
})
