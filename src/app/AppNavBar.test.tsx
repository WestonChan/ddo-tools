import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppNavBar from './AppNavBar'
import { renderWithRouter } from '../test/renderWithRouter'

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
const mockCollapse = vi.fn()

function renderNavBar(
  expanded = true,
  { initialPath = '/build-plan', overlayActive }: { initialPath?: string; overlayActive?: boolean } = {},
): ReturnType<typeof renderWithRouter> {
  return renderWithRouter(
    <AppNavBar
      expanded={expanded}
      onToggleExpanded={mockToggle}
      onCollapse={mockCollapse}
      overlayActive={overlayActive}
    />,
    initialPath,
  )
}

beforeEach(() => {
  mockToggle.mockClear()
  mockCollapse.mockClear()
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
    expect(screen.getByText('Resources')).toBeInTheDocument()
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

  // Below 600px the expanded nav bar is a full-screen overlay, so navigating
  // has to dismiss it — otherwise the destination view stays hidden behind
  // it. AppLayout owns the breakpoint check and passes `overlayActive`.
  it('collapses on navigate while it is the fullscreen overlay', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar(true, { overlayActive: true })
    await user.click(await screen.findByText('Gear'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/gear'))
    expect(mockCollapse).toHaveBeenCalled()
  })

  it('stays open on navigate when it is inline chrome', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar(true)
    await user.click(await screen.findByText('Gear'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/gear'))
    expect(mockCollapse).not.toHaveBeenCalled()
  })

  it('dismisses the fullscreen overlay on Escape', async () => {
    renderNavBar(true, { overlayActive: true })
    await screen.findByText('Gear')
    // Focusable panel: the overlay takes focus when it opens, so a keyboard
    // user lands inside it rather than on the inerted content behind.
    expect(document.querySelector('.app-nav-bar')).toHaveAttribute('tabindex', '-1')

    await userEvent.keyboard('{Escape}')

    expect(mockCollapse).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape when the nav bar is inline chrome', async () => {
    renderNavBar(true)
    await screen.findByText('Gear')
    await userEvent.keyboard('{Escape}')
    expect(mockCollapse).not.toHaveBeenCalled()
  })
})
