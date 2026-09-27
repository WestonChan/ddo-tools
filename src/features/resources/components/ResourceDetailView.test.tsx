import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResourceDetailView } from './ResourceDetailView'
import { ApiError, API_ERROR_HTTP } from '../../../lib/api'
import type { ItemDetail } from '../queries/items'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

const MELANCHOLIC = {
  sort_order: 0,
  label: 'lamordia: melancholic (accessory)',
  family: 'lamordia',
  qualifier: 'accessory',
  options: [],
}
const SLOT_CANDIDATES = {
  [MELANCHOLIC.label]: [{ augment_id: 1, name: 'Melancholic Charisma', min_level: 8, bonuses: [] }],
}

function detailFor(id: number): ItemDetail {
  return {
    id,
    name: id === 42 ? 'Test Item' : 'Other Item',
    equipment_slot: 'Trinket',
    item_category: 'Trinket',
    item_type: null,
    minimum_level: 12,
    enhancement_bonus: null,
    material: null,
    race_required: null,
    description: 'A test item.',
    drop_location: null,
    set_name: null,
    accepts_sentience: false,
    is_minor_artifact: false,
    wiki_url: 'https://ddowiki.com/page/Item:Test_Item',
    weaponStats: null,
    armorStats: null,
    augmentSlots: [MELANCHOLIC],
    bonuses: [],
    effects: [],
    clickies: [],
    quests: [],
  }
}

vi.mock('../queries/useItems', () => ({
  useItemDetail: (id: number | null) => {
    if (id === null) return { data: undefined, isPending: false, error: null }
    if (id === 404) {
      return { data: undefined, isPending: false, error: new ApiError(API_ERROR_HTTP, 404, 'no') }
    }
    if (id === 500) {
      return { data: undefined, isPending: false, error: new TypeError('Failed to fetch') }
    }
    return { data: detailFor(id), isPending: false, error: null }
  },
  useItemRows: () => ({ data: [{ id: 42, name: 'Test Item' }] }),
  useSlotCandidates: () => SLOT_CANDIDATES,
}))

afterEach(() => {
  cleanup()
})

describe('ResourceDetailView', () => {
  it('renders the parsed item body when the URL points at an item', () => {
    render(
      <ResourceDetailView
        urlEntry={{ category: 'items', id: 42, name: 'Test Item' }}
        baseCategory="items"
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Test Item' })).toBeInTheDocument()
    expect(screen.getByText('A test item.')).toBeInTheDocument()
  })

  it('resolves a nameless URL entry to its name from the cached row list', () => {
    render(<ResourceDetailView urlEntry={{ category: 'items', id: 42 }} baseCategory="items" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Test Item' })).toBeInTheDocument()
    expect(screen.getAllByText('Test Item').length).toBeGreaterThan(1)
  })

  it('renders the no-selection empty state when urlEntry is null', () => {
    const { container } = render(<ResourceDetailView urlEntry={null} baseCategory="items" />)
    expect(container.querySelector('.section-placeholder')).toHaveTextContent(/select an item/i)
  })

  it('renders not-found for an id the API does not know', () => {
    render(<ResourceDetailView urlEntry={{ category: 'items', id: 404 }} baseCategory="items" />)
    expect(screen.getByRole('status')).toHaveTextContent('No item with id 404.')
  })

  it('renders an error state for a transport failure', () => {
    render(<ResourceDetailView urlEntry={{ category: 'items', id: 500 }} baseCategory="items" />)
    expect(screen.getByRole('status')).toHaveTextContent(/could not load this item/i)
  })

  it('renders the DetailBar with breadcrumb at depth 1 (no back arrow)', () => {
    render(
      <ResourceDetailView
        urlEntry={{ category: 'items', id: 42, name: 'Test Item' }}
        baseCategory="items"
      />,
    )
    expect(screen.getByRole('button', { name: /back to items/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /back one level/i })).toBeNull()
  })

  it('does not carry an expanded augment slot over to the next item', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <ResourceDetailView
        urlEntry={{ category: 'items', id: 42, name: 'Test Item' }}
        baseCategory="items"
      />,
    )
    await user.click(screen.getByRole('button', { name: /Lamordia: Melancholic/ }))
    expect(screen.getByText('Melancholic Charisma')).toBeInTheDocument()

    rerender(
      <ResourceDetailView
        urlEntry={{ category: 'items', id: 43, name: 'Other Item' }}
        baseCategory="items"
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
