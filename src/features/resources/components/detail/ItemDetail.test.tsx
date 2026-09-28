import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, type RenderResult } from '@testing-library/react'
import { ItemDetail } from './ItemDetail'
import type { ItemDetail as ItemDetailRow, ItemQuestRef } from '../../queries/items'

afterEach(() => {
  cleanup()
})

const baseDetail: ItemDetailRow = {
  id: 42,
  name: 'Voice of the Master',
  equipment_slot: 'Trinket',
  item_category: 'Trinket',
  item_type: null,
  minimum_level: 5,
  enhancement_bonus: null,
  material: null,
  race_required: null,
  description: null,
  drop_location: null,
  set_name: null,
  accepts_sentience: false,
  is_minor_artifact: false,
  wiki_url: null,
  weaponStats: null,
  armorStats: null,
  augmentSlots: [],
  bonuses: [],
  effects: [],
  clickies: [],
  quests: [],
}

function quest(overrides: Partial<ItemQuestRef> = {}): ItemQuestRef {
  return {
    quest_id: 7,
    name: "Delera's Tomb",
    patron: null,
    pack: null,
    level: 8,
    is_raid: false,
    is_rare: false,
    duration: null,
    is_free_to_play: false,
    loot_type: 'quest',
    ...overrides,
  }
}

function renderDetail(detail: ItemDetailRow): RenderResult {
  return render(<ItemDetail detail={detail} candidates={{}} />)
}

describe('ItemDetail drop locations', () => {
  it('renders a wiki link icon next to each quest in Drops from', () => {
    renderDetail({ ...baseDetail, quests: [quest()] })
    const link = screen.getByRole('link', { name: "Open Delera's Tomb on DDO Wiki" })
    expect(link).toHaveAttribute('href', "https://ddowiki.com/page/Delera's_Tomb")
  })

  it('marks a raid drop location with a chip on the quest name, not in the meta line', () => {
    const { container } = renderDetail({
      ...baseDetail,
      quests: [quest({ patron: 'The Free Agents', is_raid: true })],
    })
    const chip = container.querySelector('.resources-quest-name .resources-chip[data-kind="raid"]')
    expect(chip).toHaveTextContent('Raid')
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(
      'The Free Agents · Level 8',
    )
  })

  it('marks a rare drop location with a chip on the quest name after the raid chip', () => {
    const { container } = renderDetail({
      ...baseDetail,
      quests: [quest({ is_raid: true, is_rare: true })],
    })
    const kinds = Array.from(container.querySelectorAll('.resources-quest-name .resources-chip')).map((c) =>
      c.getAttribute('data-kind'),
    )
    expect(kinds).toEqual(['raid', 'rare'])
    expect(container.querySelector('.resources-quest-meta .resources-chip')).toBeNull()
  })

  it('shows the Rare chip only on the quests where the item is rare', () => {
    const { container } = renderDetail({
      ...baseDetail,
      quests: [quest({ quest_id: 1, name: 'Tempest Spine', is_rare: true }), quest({ quest_id: 2, name: 'The Pit' })],
    })
    const rows = container.querySelectorAll('.resources-quest-row')
    expect(rows[0].querySelector('.resources-chip[data-kind="rare"]')).toHaveTextContent('Rare')
    expect(rows[1].querySelector('.resources-chip')).toBeNull()
  })

  it('labels end rewards in the meta line', () => {
    const { container } = renderDetail({
      ...baseDetail,
      quests: [quest({ loot_type: 'reward' })],
    })
    expect(container.querySelector('.resources-chip')).toBeNull()
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent('Level 8 · End reward')
  })

  it('falls back to the free-text drop location when no quests are linked', () => {
    renderDetail({ ...baseDetail, drop_location: 'Vendor: House Kundarak' })
    expect(screen.getByText('Drops from')).toBeInTheDocument()
    expect(screen.getByText('Vendor: House Kundarak')).toBeInTheDocument()
  })

  it('renders no Drops from section when the item has no source at all', () => {
    renderDetail(baseDetail)
    expect(screen.queryByText('Drops from')).toBeNull()
  })
})

describe('ItemDetail header attributes', () => {
  it('shows the enhancement bonus signed and the set name when present', () => {
    renderDetail({ ...baseDetail, enhancement_bonus: 5, set_name: 'Adherent of the Mists' })
    expect(screen.getByText('Enhancement')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('Adherent of the Mists')).toBeInTheDocument()
  })

  it('lists clickies with their description', () => {
    renderDetail({
      ...baseDetail,
      clickies: [{ name: 'Haste', description: 'Haste (3 charges)', spell_id: null }],
    })
    expect(screen.getByText('Clickies')).toBeInTheDocument()
    expect(screen.getByText('Haste (3 charges)')).toBeInTheDocument()
  })
})
