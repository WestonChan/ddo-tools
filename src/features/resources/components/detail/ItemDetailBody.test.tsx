import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, type RenderResult } from '@testing-library/react'
import { ItemDetailBody } from './ItemDetailBody'
import type { Item, LootQuest } from '../../queries/items'

afterEach(() => {
  cleanup()
})

const plainItem: Item = {
  id: 42,
  name: 'Voice of the Master',
  equipmentSlot: 'Trinket',
  category: 'Trinket',
  type: null,
  minimumLevel: 5,
  enhancementBonus: null,
  material: null,
  requiredRace: null,
  description: null,
  dropLocation: null,
  setName: null,
  canAcceptSentience: false,
  isMinorArtifact: false,
  wikiUrl: null,
  provenance: 'maetrim',
  weaponStats: null,
  armorStats: null,
  augmentSlots: [],
  bonuses: [],
  effects: [],
  clickies: [],
  quests: [],
  questChains: [],
  sagas: [],
}

function quest(overrides: Partial<LootQuest> = {}): LootQuest {
  return {
    id: 7,
    name: "Delera's Tomb",
    patron: null,
    pack: null,
    level: 8,
    isRaid: false,
    isRareLoot: false,
    isFreeToPlay: false,
    isEndReward: false,
    chests: [],
    ...overrides,
  }
}

function renderItemDetailBody(item: Item): RenderResult {
  return render(<ItemDetailBody item={item} augmentsBySlotLabel={{}} />)
}

describe('ItemDetailBody drop locations', () => {
  it('renders a wiki link icon next to each quest in Drops from', () => {
    renderItemDetailBody({ ...plainItem, quests: [quest()] })
    const link = screen.getByRole('link', { name: "Open Delera's Tomb on DDO Wiki" })
    expect(link).toHaveAttribute('href', "https://ddowiki.com/page/Delera's_Tomb")
  })

  it('marks a raid drop location with a chip on the quest name, not in the meta line', () => {
    const { container } = renderItemDetailBody({
      ...plainItem,
      quests: [quest({ patron: 'The Free Agents', isRaid: true })],
    })
    const chip = container.querySelector('.resources-quest-name .resources-chip[data-kind="raid"]')
    expect(chip).toHaveTextContent('Raid')
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(
      'The Free Agents · Level 8',
    )
  })

  it('marks a rare drop location with a chip on the quest name after the raid chip', () => {
    const { container } = renderItemDetailBody({
      ...plainItem,
      quests: [quest({ isRaid: true, isRareLoot: true })],
    })
    const kinds = Array.from(
      container.querySelectorAll('.resources-quest-name .resources-chip'),
    ).map((c) => c.getAttribute('data-kind'))
    expect(kinds).toEqual(['raid', 'rare'])
    expect(container.querySelector('.resources-quest-meta .resources-chip')).toBeNull()
  })

  it('shows the Rare chip only on the quests where the item is rare', () => {
    const { container } = renderItemDetailBody({
      ...plainItem,
      quests: [
        quest({ id: 1, name: 'Tempest Spine', isRareLoot: true }),
        quest({ id: 2, name: 'The Pit' }),
      ],
    })
    const rows = container.querySelectorAll('.resources-quest-row')
    expect(rows[0].querySelector('.resources-chip[data-kind="rare"]')).toHaveTextContent('Rare')
    expect(rows[1].querySelector('.resources-chip')).toBeNull()
  })

  it('labels end rewards in the meta line', () => {
    const { container } = renderItemDetailBody({
      ...plainItem,
      quests: [quest({ isEndReward: true })],
    })
    expect(container.querySelector('.resources-chip')).toBeNull()
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(
      'Level 8 · End reward',
    )
  })

  it('names the chest after the quest name in sentence case', () => {
    const { container } = renderItemDetailBody({
      ...plainItem,
      quests: [quest({ chests: ["althea's chest"] })],
    })
    expect(
      container.querySelector('.resources-quest-name .resources-quest-chest'),
    ).toHaveTextContent("Althea's chest")
  })

  it('renders one row for a quest that is both a chest drop and the end reward', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderItemDetailBody({
      ...plainItem,
      quests: [quest({ chests: ['end chest'], isEndReward: true, isRareLoot: true })],
    })
    const rows = container.querySelectorAll('.resources-quest-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].querySelector('.resources-quest-chest')).toHaveTextContent('End chest')
    expect(rows[0].querySelector('.resources-quest-meta')).toHaveTextContent('Level 8 · End reward')
    expect(rows[0].querySelectorAll('.resources-chip[data-kind="rare"]')).toHaveLength(1)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('lists a quest chain end reward after the quest rows with a Rare chip and wiki link', () => {
    const { container } = renderItemDetailBody({
      ...plainItem,
      quests: [quest()],
      questChains: [{ id: 3, name: 'The Lost Seekers', isRareLoot: true }],
    })
    const rows = container.querySelectorAll('.resources-quest-row')
    expect(rows).toHaveLength(2)
    expect(rows[1].querySelector('.resources-quest-title')).toHaveTextContent('The Lost Seekers')
    expect(rows[1].querySelector('.resources-chip[data-kind="rare"]')).toHaveTextContent('Rare')
    expect(rows[1].querySelector('.resources-quest-meta')).toHaveTextContent('Chain end reward')
    expect(
      screen.getByRole('link', { name: 'Open The Lost Seekers on DDO Wiki' }),
    ).toBeInTheDocument()
  })

  it('lists a saga reward per tier with the tier in sentence case', () => {
    const { container } = renderItemDetailBody({
      ...plainItem,
      sagas: [
        { id: 1, name: 'Masterminds of Sharn', tier: 'epic', isRareLoot: false },
        { id: 1, name: 'Masterminds of Sharn', tier: 'legendary', isRareLoot: true },
      ],
    })
    expect(screen.getByText('Drops from')).toBeInTheDocument()
    const rows = container.querySelectorAll('.resources-quest-row')
    expect(
      Array.from(rows).map((r) => r.querySelector('.resources-quest-meta')?.textContent),
    ).toEqual(['Saga reward · Epic', 'Saga reward · Legendary'])
    expect(rows[0].querySelector('.resources-chip')).toBeNull()
    expect(rows[1].querySelector('.resources-chip[data-kind="rare"]')).toHaveTextContent('Rare')
    expect(
      screen.getAllByRole('link', { name: 'Open Masterminds of Sharn on DDO Wiki' }),
    ).toHaveLength(2)
  })

  it('lists a saga reward with no tier as Saga reward alone', () => {
    const { container } = renderItemDetailBody({
      ...plainItem,
      sagas: [{ id: 1, name: 'Masterminds of Sharn', tier: null, isRareLoot: false }],
    })
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(/^Saga reward$/)
  })

  it('shows no chest when the drop text names none', () => {
    const { container } = renderItemDetailBody({ ...plainItem, quests: [quest()] })
    expect(container.querySelector('.resources-quest-chest')).toBeNull()
  })

  it('falls back to the free-text drop location when no quests are linked', () => {
    renderItemDetailBody({ ...plainItem, dropLocation: 'Vendor: House Kundarak' })
    expect(screen.getByText('Drops from')).toBeInTheDocument()
    expect(screen.getByText('Vendor: House Kundarak')).toBeInTheDocument()
  })

  it('renders no Drops from section when the item has no source at all', () => {
    renderItemDetailBody(plainItem)
    expect(screen.queryByText('Drops from')).toBeNull()
  })
})

describe('ItemDetailBody header attributes', () => {
  it('shows the enhancement bonus signed and the set name when present', () => {
    renderItemDetailBody({ ...plainItem, enhancementBonus: 5, setName: 'Adherent of the Mists' })
    expect(screen.getByText('Enhancement')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('Adherent of the Mists')).toBeInTheDocument()
  })

  it('lists clickies with their description', () => {
    renderItemDetailBody({
      ...plainItem,
      clickies: [{ name: 'Haste', description: 'Haste (3 charges)' }],
    })
    expect(screen.getByText('Clickies')).toBeInTheDocument()
    expect(screen.getByText('Haste (3 charges)')).toBeInTheDocument()
  })
})

describe('ItemDetailBody provenance', () => {
  it('shows a Source row linking the wiki page for a wiki-sourced item', () => {
    renderItemDetailBody({
      ...plainItem,
      provenance: 'wiki',
      wikiUrl: 'https://ddowiki.com/page/Item:Voice_of_the_Master',
    })
    const sourceLink = screen.getByRole('link', { name: 'DDO Wiki (not yet in DDOBuilderV2)' })
    expect(sourceLink).toHaveAttribute('href', 'https://ddowiki.com/page/Item:Voice_of_the_Master')
    expect(screen.getByText('Source')).toBeInTheDocument()
  })

  it('shows no Source row for an item from DDOBuilderV2', () => {
    renderItemDetailBody({
      ...plainItem,
      wikiUrl: 'https://ddowiki.com/page/Item:Voice_of_the_Master',
    })
    expect(screen.queryByText('Source')).toBeNull()
    expect(screen.queryByText('DDO Wiki (not yet in DDOBuilderV2)')).toBeNull()
  })
})

describe('ItemDetailBody action row', () => {
  it.each(['Add to compare', 'Compare in Gear', 'Add to farm list'])(
    'renders %s disabled',
    (label) => {
      renderItemDetailBody(plainItem)
      expect(screen.getByRole('button', { name: label })).toBeDisabled()
    },
  )

  it('explains when the actions arrive', () => {
    renderItemDetailBody(plainItem)
    expect(
      screen.getByText('Actions arrive with the Gear and Farm checklist phases.'),
    ).toBeInTheDocument()
  })
})
