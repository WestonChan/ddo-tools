import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppNavBar from './AppNavBar'
import { renderWithRouter } from '../test-utils/renderWithRouter'

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

const mockToggle = vi.fn()

function renderNavBar(expanded = true, initialPath = '/build-plan'): ReturnType<typeof renderWithRouter> {
  return renderWithRouter(
    <AppNavBar expanded={expanded} onToggleExpanded={mockToggle} />,
    initialPath,
  )
}

beforeEach(() => {
  mockToggle.mockClear()
})

describe('AppNavBar', () => {
  it('renders top-level nav items', async () => {
    renderNavBar()
    expect(await screen.findByText('Gear')).toBeInTheDocument()
    expect(screen.getByText('Build Overview')).toBeInTheDocument()
  })

  it('renders group labels', async () => {
    renderNavBar()
    // Build Plan appears as both group label and parent nav button
    await waitFor(() => expect(screen.getAllByText('Build Plan').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('shows all group items', async () => {
    renderNavBar()
    expect(await screen.findByText('Level Plan')).toBeInTheDocument()
    expect(screen.getByText('Skills')).toBeInTheDocument()
    expect(screen.getByText('Spells')).toBeInTheDocument()
    expect(screen.getByText('Enhancements')).toBeInTheDocument()
    expect(screen.getByText('Reaper')).toBeInTheDocument()
    expect(screen.getByText('Destinies')).toBeInTheDocument()
    expect(screen.getByText('Damage Calc')).toBeInTheDocument()
    expect(screen.getByText('Farm Checklist')).toBeInTheDocument()
    expect(screen.getByText('Debug')).toBeInTheDocument()
  })

  it('renders character name', async () => {
    renderNavBar()
    expect(await screen.findByText('Thordak')).toBeInTheDocument()
  })

  it('renders settings', async () => {
    renderNavBar()
    expect(await screen.findByText('Settings')).toBeInTheDocument()
  })

  it('navigates when a nav item is clicked', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar()
    await user.click(await screen.findByText('Gear'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/gear'))
  })

  it('navigates to characters when character name is clicked', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar()
    await user.click(await screen.findByText('Thordak'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/characters'))
  })

  it('closes nav bar on navigate at narrow widths', async () => {
    const original = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })

    const user = userEvent.setup()
    const { router } = renderNavBar(true)
    await user.click(await screen.findByText('Gear'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/gear'))
    expect(mockToggle).toHaveBeenCalled()

    Object.defineProperty(window, 'innerWidth', { value: original, writable: true })
  })

  it('does not close nav bar on navigate at wide widths', async () => {
    const original = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })

    const user = userEvent.setup()
    const { router } = renderNavBar(true)
    await user.click(await screen.findByText('Gear'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/gear'))
    expect(mockToggle).not.toHaveBeenCalled()

    Object.defineProperty(window, 'innerWidth', { value: original, writable: true })
  })
})
