import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppNavBar from './AppNavBar'
import { renderWithRouter } from '../test/renderWithRouter'

vi.mock('../features/character', () => ({
  useCharacters: () => ({
    selectedCharacter: { id: '1', name: 'Thordak', server: 'Thrane' },
    viewedBuild: {
      id: 'b1',
      name: '',
      race: 'human',
      classes: [
        { classId: 'paladin', levels: 18 },
        { classId: 'rogue', levels: 2 },
      ],
    },
    lifeNumbersByLifeId: new Map([['b1', 3]]),
  }),
  classSplitLabel: () => '18 Paladin / 2 Rogue',
  raceLabelOf: () => 'Human',
}))

const onToggleExpandedMock = vi.fn()
const onCollapseMock = vi.fn()

function renderNavBar(
  isExpanded = true,
  {
    initialPath = '/build-plan',
    isFullscreenOverlay,
  }: { initialPath?: string; isFullscreenOverlay?: boolean } = {},
): ReturnType<typeof renderWithRouter> {
  return renderWithRouter(
    <AppNavBar
      isExpanded={isExpanded}
      onToggleExpanded={onToggleExpandedMock}
      onCollapse={onCollapseMock}
      isFullscreenOverlay={isFullscreenOverlay}
    />,
    initialPath,
  )
}

beforeEach(() => {
  onToggleExpandedMock.mockClear()
  onCollapseMock.mockClear()
})

describe('AppNavBar', () => {
  it('renders top-level nav items', async () => {
    renderNavBar()
    expect(await screen.findByText('Gear')).toBeInTheDocument()
    expect(screen.getByText('Build Overview')).toBeInTheDocument()
  })

  it('renders group labels', async () => {
    renderNavBar()
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

  it('collapses on navigate while it is the fullscreen overlay', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar(true, { isFullscreenOverlay: true })
    await user.click(await screen.findByText('Gear'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/gear'))
    expect(onCollapseMock).toHaveBeenCalled()
  })

  it('stays open on navigate when it is inline chrome', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar(true)
    await user.click(await screen.findByText('Gear'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/gear'))
    expect(onCollapseMock).not.toHaveBeenCalled()
  })

  it('dismisses the fullscreen overlay on Escape', async () => {
    renderNavBar(true, { isFullscreenOverlay: true })
    await screen.findByText('Gear')
    expect(document.querySelector('.app-nav-bar')).toHaveAttribute('tabindex', '-1')

    await userEvent.keyboard('{Escape}')

    expect(onCollapseMock).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape when the nav bar is inline chrome', async () => {
    renderNavBar(true)
    await screen.findByText('Gear')
    await userEvent.keyboard('{Escape}')
    expect(onCollapseMock).not.toHaveBeenCalled()
  })
})
