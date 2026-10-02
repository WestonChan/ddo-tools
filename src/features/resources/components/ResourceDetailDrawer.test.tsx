import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResourceDetailDrawer } from './ResourceDetailDrawer'
import { ApiError, API_HTTP_ERROR } from '../../../lib/api'
import type { Item } from '../queries/items'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

const MELANCHOLIC_SLOT = {
  sortOrder: 0,
  label: 'lamordia: melancholic (accessory)',
  family: 'lamordia',
  qualifier: 'accessory',
  options: [],
}
const AUGMENTS_BY_SLOT_LABEL = {
  [MELANCHOLIC_SLOT.label]: [
    { id: 1, name: 'Melancholic Charisma', minimumLevel: 8, bonusNames: [], recipes: [] },
  ],
}

function itemDetailFor(id: number): Item {
  return {
    id,
    name: id === 42 ? 'Test Item' : 'Other Item',
    equipmentSlot: 'Trinket',
    category: 'Trinket',
    type: null,
    minimumLevel: 12,
    enhancementBonus: null,
    material: null,
    requiredRace: null,
    description: 'A test item.',
    dropLocation: null,
    setName: null,
    canAcceptSentience: false,
    isMinorArtifact: false,
    wikiUrl: 'https://ddowiki.com/page/Item:Test_Item',
    provenance: 'maetrim',
    weaponStats: null,
    armorStats: null,
    augmentSlots: [MELANCHOLIC_SLOT],
    bonuses: [],
    effects: [],
    clickies: [],
    quests: [],
    questChains: [],
    sagas: [],
    sourcesBeyondQuests: [],
  }
}

vi.mock('../queries/useItems', () => ({
  useItem: (id: number | null) => {
    if (id === null) return { data: undefined, isPending: false, error: null }
    if (id === 404) {
      return { data: undefined, isPending: false, error: new ApiError(API_HTTP_ERROR, 404, 'no') }
    }
    if (id === 500) {
      return { data: undefined, isPending: false, error: new TypeError('Failed to fetch') }
    }
    return { data: itemDetailFor(id), isPending: false, error: null }
  },
  useItemSummaries: () => ({ data: [{ id: 42, name: 'Test Item' }] }),
  useFittingAugmentsBySlotLabel: () => AUGMENTS_BY_SLOT_LABEL,
}))

afterEach(() => {
  cleanup()
})

describe('ResourceDetailDrawer', () => {
  it('renders the parsed item body when the URL points at an item', () => {
    render(
      <ResourceDetailDrawer
        resourceInUrl={{ category: 'items', id: 42, name: 'Test Item' }}
        pickerCategory="items"
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Test Item' })).toBeInTheDocument()
    expect(screen.getByText('A test item.')).toBeInTheDocument()
  })

  it('resolves a nameless URL entry to its name from the cached row list', () => {
    render(
      <ResourceDetailDrawer resourceInUrl={{ category: 'items', id: 42 }} pickerCategory="items" />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Test Item' })).toBeInTheDocument()
    expect(screen.getAllByText('Test Item').length).toBeGreaterThan(1)
  })

  it('renders the no-selection empty state when resourceInUrl is null', () => {
    render(<ResourceDetailDrawer resourceInUrl={null} pickerCategory="items" />)
    expect(screen.getByRole('status')).toHaveTextContent(/select an item/i)
  })

  it('renders not-found for an id the API does not know', () => {
    render(
      <ResourceDetailDrawer
        resourceInUrl={{ category: 'items', id: 404 }}
        pickerCategory="items"
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('No item with id 404.')
  })

  it('renders an error state for a transport failure', () => {
    render(
      <ResourceDetailDrawer
        resourceInUrl={{ category: 'items', id: 500 }}
        pickerCategory="items"
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(/could not load this item/i)
  })

  it('renders the DetailBreadcrumbBar with breadcrumb at depth 1 (no back arrow)', () => {
    render(
      <ResourceDetailDrawer
        resourceInUrl={{ category: 'items', id: 42, name: 'Test Item' }}
        pickerCategory="items"
      />,
    )
    expect(screen.getByRole('button', { name: /back to items/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /back one level/i })).toBeNull()
  })

  it('does not carry an expanded augment slot over to the next item', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <ResourceDetailDrawer
        resourceInUrl={{ category: 'items', id: 42, name: 'Test Item' }}
        pickerCategory="items"
      />,
    )
    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))
    expect(screen.getByText('Melancholic Charisma')).toBeInTheDocument()

    rerender(
      <ResourceDetailDrawer
        resourceInUrl={{ category: 'items', id: 43, name: 'Other Item' }}
        pickerCategory="items"
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Other Item' })).toBeInTheDocument()
    expect(screen.queryByText('Melancholic Charisma')).toBeNull()
    expect(screen.getByRole('button', { name: /Lamordia: Melancholic/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
