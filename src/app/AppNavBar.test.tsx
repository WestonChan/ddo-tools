import { render, screen, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppNavBar from './AppNavBar'

vi.mock('../features/character', () => ({
  useCharacter: () => ({
    character: { id: '1', name: 'Thordak', server: 'Thrane' },
    activeBuild: {
      id: 'b1',
      name: '',
      race: 'human',
      classes: [
        { classId: 'paladin', levels: 18 },
        { classId: 'rogue', levels: 2 },
      ],
    },
    lifeNumbers: new Map([['b1', 3]]),
  }),
  formatClassSummary: () => '18 Paladin / 2 Rogue',
  formatRace: () => 'Human',
}))

const mockNavigate = vi.fn()
const mockToggle = vi.fn()

function renderNavBar(expanded = true): RenderResult {
  return render(
    <AppNavBar
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

describe('AppNavBar', () => {
  it('renders top-level nav items', () => {
    renderNavBar()
    expect(screen.getByText('Gear')).toBeInTheDocument()
    expect(screen.getByText('Build Overview')).toBeInTheDocument()
  })

  it('renders group labels', () => {
    renderNavBar()
    // Build Plan appears as both group label and parent nav button
    expect(screen.getAllByText('Build Plan').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('shows all group items', () => {
    renderNavBar()
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
    renderNavBar()
    expect(screen.getByText('Thordak')).toBeInTheDocument()
  })

  it('renders settings', () => {
    renderNavBar()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('navigates when a nav item is clicked', async () => {
    const user = userEvent.setup()
    renderNavBar()
    await user.click(screen.getByText('Gear'))
    expect(mockNavigate).toHaveBeenCalledWith('gear')
  })

  it('navigates to characters when character name is clicked', async () => {
    const user = userEvent.setup()
    renderNavBar()
    await user.click(screen.getByText('Thordak'))
    expect(mockNavigate).toHaveBeenCalledWith('characters')
  })

  it('closes nav bar on navigate at narrow widths', async () => {
    const original = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })

    const user = userEvent.setup()
    renderNavBar(true)
    await user.click(screen.getByText('Gear'))

    expect(mockNavigate).toHaveBeenCalledWith('gear')
    expect(mockToggle).toHaveBeenCalled()

    Object.defineProperty(window, 'innerWidth', { value: original, writable: true })
  })

  it('does not close nav bar on navigate at wide widths', async () => {
    const original = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })

    const user = userEvent.setup()
    renderNavBar(true)
    await user.click(screen.getByText('Gear'))

    expect(mockNavigate).toHaveBeenCalledWith('gear')
    expect(mockToggle).not.toHaveBeenCalled()

    Object.defineProperty(window, 'innerWidth', { value: original, writable: true })
  })
})
