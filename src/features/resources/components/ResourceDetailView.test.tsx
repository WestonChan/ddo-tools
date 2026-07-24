import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ResourceDetailView } from './ResourceDetailView'

// Mock router (useDetailStack uses useNavigate).
const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

// Mock useDatabase + getItemDetail so we don't need a real sql.js DB.
vi.mock('../../../hooks/useDatabase', () => ({
  useDatabase: () => ({ db: { /* sentinel */ } }),
}))

vi.mock('../queries/items', async () => {
  const actual = await vi.importActual<typeof import('../queries/items')>('../queries/items')
  return {
    ...actual,
    getItemDetail: vi.fn(() => ({
      id: 42,
      name: 'Test Item',
      rarity: 'Rare',
      equipment_slot: 'Trinket',
      item_category: null,
      level: null,
      minimum_level: 12,
      enhancement_bonus: null,
      material: null,
      binding: null,
      base_value: null,
      tooltip: null,
      icon: null,
      description: 'A test item.',
      wiki_url: 'https://ddowiki.com/page/Item:Test_Item',
      weaponStats: null,
      armorStats: null,
      augmentSlots: [],
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
    const { container } = render(
      <ResourceDetailView urlEntry={null} baseCategory="items" />,
    )
    // Only one DetailEmpty renders when the stack is empty (no parsed body).
    expect(container.querySelector('.section-placeholder')).toHaveTextContent(
      /select an item/i,
    )
  })

  it('renders the DetailBar with breadcrumb at depth 1 (no back arrow)', () => {
    render(
      <ResourceDetailView
        urlEntry={{ category: 'items', id: 42, name: 'Test Item' }}
        baseCategory="items"
      />,
    )
    // "Back to items" link in EntityHeader replaces the old close-all button
    expect(
      screen.getByRole('button', { name: /back to items/i }),
    ).toBeInTheDocument()
    // Back arrow hidden at depth 1 (no previous level to go back to)
    expect(screen.queryByRole('button', { name: /back one level/i })).toBeNull()
  })
})
