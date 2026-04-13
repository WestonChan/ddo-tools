import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppSidebar from './AppSidebar'

vi.mock('../features/character', () => ({
  useCharacter: () => ({
    character: { id: '1', name: 'Thordak', server: 'Thrane' },
    activeBuild: {
      id: 'b1',
      race: 'human',
      classes: [
        { classId: 'paladin', levels: 18 },
        { classId: 'rogue', levels: 2 },
      ],
    },
  }),
  formatClassSummary: () => '18 Paladin / 2 Rogue',
  formatRace: () => 'Human',
}))

const mockNavigate = vi.fn()
const mockToggle = vi.fn()

function renderSidebar(expanded = true) {
  return render(
    <AppSidebar
      activeView="build-plan"
      onViewChange={mockNavigate}
      expanded={expanded}
      onToggleExpanded={mockToggle}
    />,
  )
}

beforeEach(() => {
  mockNavigate.mockClear()
  mockToggle.mockClear()
})

describe('AppSidebar', () => {
  it('renders top-level nav items', () => {
    renderSidebar()
    expect(screen.getByText('Gear')).toBeInTheDocument()
    expect(screen.getByText('Build Overview')).toBeInTheDocument()
  })

  it('renders group labels', () => {
    renderSidebar()
    // Build Plan appears as both group label and parent nav button
    expect(screen.getAllByText('Build Plan').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('shows all group items', () => {
    renderSidebar()
    expect(screen.getByText('Level Plan')).toBeInTheDocument()
    expect(screen.getByText('Skills')).toBeInTheDocument()
    expect(screen.getByText('Spells')).toBeInTheDocument()
    expect(screen.getByText('Enhancements')).toBeInTheDocument()
    expect(screen.getByText('Reaper')).toBeInTheDocument()
    expect(screen.getByText('Destinies')).toBeInTheDocument()
    expect(screen.getByText('Damage Calc')).toBeInTheDocument()
    expect(screen.getByText('Farm Checklist')).toBeInTheDocument()
    expect(screen.getByText('Debug')).toBeInTheDocument()
  })

  it('renders character name', () => {
    renderSidebar()
    expect(screen.getByText('Thordak')).toBeInTheDocument()
  })

  it('renders settings', () => {
    renderSidebar()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('navigates when a nav item is clicked', async () => {
    const user = userEvent.setup()
    renderSidebar()
    await user.click(screen.getByText('Gear'))
    expect(mockNavigate).toHaveBeenCalledWith('gear')
  })

  it('navigates to characters when character name is clicked', async () => {
    const user = userEvent.setup()
    renderSidebar()
    await user.click(screen.getByText('Thordak'))
    expect(mockNavigate).toHaveBeenCalledWith('characters')
  })

  it('closes sidebar on navigate at narrow widths', async () => {
    const original = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })

    const user = userEvent.setup()
    renderSidebar(true)
    await user.click(screen.getByText('Gear'))

    expect(mockNavigate).toHaveBeenCalledWith('gear')
    expect(mockToggle).toHaveBeenCalled()

    Object.defineProperty(window, 'innerWidth', { value: original, writable: true })
  })

  it('does not close sidebar on navigate at wide widths', async () => {
    const original = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })

    const user = userEvent.setup()
    renderSidebar(true)
    await user.click(screen.getByText('Gear'))

    expect(mockNavigate).toHaveBeenCalledWith('gear')
    expect(mockToggle).not.toHaveBeenCalled()

    Object.defineProperty(window, 'innerWidth', { value: original, writable: true })
  })
})
