import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResourceDetailView } from './ResourceDetailView'

// Mock router (useDetailStack uses useNavigate).
const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

// Mock useDatabase + getItemDetail so we don't need a real sql.js DB.
vi.mock('../../../hooks/useDatabase', () => ({
  useDatabase: () => ({
    db: {
      /* sentinel */
    },
  }),
}))

// Both fixture items carry the same crafting slot, so a stale expansion would
// look perfectly plausible on the second item — which is why the bug survived
// a manual click-through.
const MELANCHOLIC = {
  sort_order: 0,
  slot_id: 6,
  label: 'lamordia: melancholic (accessory)',
  family: 'lamordia',
  qualifier: 'accessory',
}
const SLOT_CANDIDATES = {
  [MELANCHOLIC.slot_id]: [
    { augment_id: 1, name: 'Melancholic Charisma', min_level: 8, bonuses: [] },
  ],
}

vi.mock('../queries/items', async () => {
  const actual = await vi.importActual<typeof import('../queries/items')>('../queries/items')
  return {
    ...actual,
    getItemDetail: vi.fn((_db: unknown, id: number) => ({
      id,
      name: id === 42 ? 'Test Item' : 'Other Item',
      rarity: 'Rare',
      equipment_slot: 'Trinket',
      item_category: null,
      level: null,
      minimum_level: 12,
      material: null,
      binding: null,
      base_value: null,
      tooltip: null,
      icon: null,
      description: 'A test item.',
      wiki_url: 'https://ddowiki.com/page/Item:Test_Item',
      weaponStats: null,
      armorStats: null,
      augmentSlots: [MELANCHOLIC],
      slotCandidates: SLOT_CANDIDATES,
      upgrades: [],
      bonuses: [],
      effects: [],
      spellLinks: [],
      quests: [],
    })),
  }
})

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
    // Item name appears in both the breadcrumb and the EntityHeader; the
    // EntityHeader uses an <h2>, so query by role to disambiguate.
    expect(screen.getByRole('heading', { level: 2, name: 'Test Item' })).toBeInTheDocument()
    expect(screen.getByText('A test item.')).toBeInTheDocument()
  })

  it('renders the no-selection empty state when urlEntry is null', () => {
    const { container } = render(<ResourceDetailView urlEntry={null} baseCategory="items" />)
    // Only one DetailEmpty renders when the stack is empty (no parsed body).
    expect(container.querySelector('.section-placeholder')).toHaveTextContent(/select an item/i)
  })

  it('renders the DetailBar with breadcrumb at depth 1 (no back arrow)', () => {
    render(
      <ResourceDetailView
        urlEntry={{ category: 'items', id: 42, name: 'Test Item' }}
        baseCategory="items"
      />,
    )
    // "Back to items" link in EntityHeader replaces the old close-all button
    expect(screen.getByRole('button', { name: /back to items/i })).toBeInTheDocument()
    // Back arrow hidden at depth 1 (no previous level to go back to)
    expect(screen.queryByRole('button', { name: /back one level/i })).toBeNull()
  })

  it('does not carry an expanded augment slot over to the next item', async () => {
    // The detail body holds per-item UI state. Without a key on the entity,
    // navigating feeds new props to the same component instance and item B
    // opens with item A's slot already expanded.
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
