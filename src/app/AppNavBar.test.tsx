import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CharacterProvider } from '../features/character'
import { renderWithRouter } from '../test/renderWithRouter'
import AppNavBar from './AppNavBar'
import type { BuildWarning } from './buildWarnings'

const onToggleExpandedMock = vi.fn()
const onCollapseMock = vi.fn()

function renderNavBar({
  isExpanded = true,
  initialPath = '/build-plan',
  isFullscreenOverlay,
  warnings = [],
}: {
  isExpanded?: boolean
  initialPath?: string
  isFullscreenOverlay?: boolean
  warnings?: BuildWarning[]
} = {}): ReturnType<typeof renderWithRouter> {
  return renderWithRouter(
    <CharacterProvider>
      <AppNavBar
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpandedMock}
        onCollapse={onCollapseMock}
        isFullscreenOverlay={isFullscreenOverlay}
        warnings={warnings}
      />
    </CharacterProvider>,
    initialPath,
  )
}

const BUILD_PLAN_SECTION_LABELS = [
  'Levels',
  'Skills',
  'Spells',
  'Enhancements',
  'Destinies',
  'Reaper',
]

beforeEach(() => {
  localStorage.clear()
  onToggleExpandedMock.mockClear()
  onCollapseMock.mockClear()
})

describe('AppNavBar', () => {
  it('links the wordmark to the landing page, shortened to DT when collapsed', async () => {
    const { renderResult } = renderNavBar()
    expect(await screen.findByRole('link', { name: 'DDO TOOLS' })).toHaveAttribute('href', '/')
    renderResult.unmount()

    renderNavBar({ isExpanded: false })
    expect(await screen.findByRole('link', { name: 'DT' })).toHaveAttribute('href', '/')
  })

  it('groups the destinations under Roster, Build and Tools', async () => {
    renderNavBar({ initialPath: '/gear' })
    const expectedHrefsByLabel = {
      'Characters & builds': '/characters',
      'Build overview': '/overview',
      'Build plan': '/build-plan',
      Gear: '/gear',
      'Damage calc': '/damage-calc',
      'Farm checklist': '/farm-checklist',
      Resources: '/resources',
      Settings: '/settings',
    }
    await screen.findByRole('link', { name: 'Gear' })
    for (const [label, href] of Object.entries(expectedHrefsByLabel)) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    }
    for (const groupLabel of ['Roster', 'Build', 'Tools']) {
      expect(screen.getByText(groupLabel)).toBeInTheDocument()
    }
  })

  it('shows the Build plan sections only on /build-plan with the rail expanded', async () => {
    const { renderResult } = renderNavBar({ initialPath: '/gear' })
    await screen.findByRole('link', { name: 'Gear' })
    for (const label of BUILD_PLAN_SECTION_LABELS) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
    }
    renderResult.unmount()

    const { renderResult: buildPlanRender } = renderNavBar({ initialPath: '/build-plan' })
    await screen.findByRole('link', { name: 'Gear' })
    for (const label of BUILD_PLAN_SECTION_LABELS) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'href',
        `/build-plan#${label.toLowerCase()}`,
      )
    }
    buildPlanRender.unmount()

    renderNavBar({ initialPath: '/build-plan', isExpanded: false })
    await screen.findByRole('link', { name: 'Gear' })
    for (const label of BUILD_PLAN_SECTION_LABELS) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
    }
  })

  it('navigates to a Build plan section and marks only that section current', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar({ initialPath: '/build-plan' })

    await user.click(await screen.findByRole('link', { name: 'Skills' }))

    await waitFor(() => expect(router.state.location.hash).toBe('skills'))
    expect(router.state.location.pathname).toBe('/build-plan')
    expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Levels' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Build plan' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens the warnings popover with the empty-state sentence when there are no warnings', async () => {
    const user = userEvent.setup()
    renderNavBar()

    await user.click(await screen.findByRole('button', { name: /^Warnings/ }))

    const warningsPopover = screen.getByRole('group', { name: 'Build warnings' })
    expect(warningsPopover).toHaveTextContent(
      'No warnings yet — build validation arrives with the stats engine.',
    )
  })

  it('lists each warning and navigates to where it points', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar({
      initialPath: '/gear',
      warnings: [{ message: '2 unspent feats', locationLabel: 'Levels 18, 20', to: '/build-plan' }],
    })

    const warningsRow = await screen.findByRole('button', { name: /^Warnings/ })
    expect(warningsRow).toHaveTextContent('1')
    await user.click(warningsRow)
    const warningsPopover = screen.getByRole('group', { name: 'Build warnings' })
    await user.click(within(warningsPopover).getByRole('button', { name: /2 unspent feats/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/build-plan'))
    expect(screen.queryByRole('group', { name: 'Build warnings' })).not.toBeInTheDocument()
  })

  it('toggles the rail from the Collapse row', async () => {
    const user = userEvent.setup()
    renderNavBar()
    await user.click(await screen.findByRole('button', { name: 'Collapse' }))
    expect(onToggleExpandedMock).toHaveBeenCalledTimes(1)
  })

  describe('footer', () => {
    let windowOpenSpy: ReturnType<typeof vi.spyOn>
    beforeEach(() => {
      windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    })
    afterEach(() => {
      windowOpenSpy.mockRestore()
    })

    it('opens a pre-filled GitHub issue from Report a bug', async () => {
      const user = userEvent.setup()
      renderNavBar()

      await user.click(await screen.findByRole('button', { name: 'Report a bug' }))

      expect(windowOpenSpy).toHaveBeenCalledOnce()
      const [url, target, features] = windowOpenSpy.mock.calls[0]
      expect(url).toContain('github.com/WestonChan/ddo-tools/issues/new')
      expect(url).toContain('title=User%20report')
      expect(target).toBe('_blank')
      expect(features).toBe('noopener,noreferrer')
    })

    it('links GitHub to the repository in a new tab', async () => {
      renderNavBar()
      const gitHubLink = await screen.findByRole('link', { name: 'GitHub' })
      expect(gitHubLink).toHaveAttribute('href', 'https://github.com/WestonChan/ddo-tools')
      expect(gitHubLink).toHaveAttribute('target', '_blank')
      expect(gitHubLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
    })
  })

  it('collapses on navigate while it is the fullscreen overlay', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar({ isFullscreenOverlay: true })
    await user.click(await screen.findByRole('link', { name: 'Gear' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/gear'))
    expect(onCollapseMock).toHaveBeenCalled()
  })

  it('stays open on navigate when it is inline chrome', async () => {
    const user = userEvent.setup()
    const { router } = renderNavBar()
    await user.click(await screen.findByRole('link', { name: 'Gear' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/gear'))
    expect(onCollapseMock).not.toHaveBeenCalled()
  })

  it('dismisses the fullscreen overlay on Escape', async () => {
    renderNavBar({ isFullscreenOverlay: true })
    await screen.findByRole('link', { name: 'Gear' })
    expect(document.querySelector('.app-nav-bar')).toHaveAttribute('tabindex', '-1')

    await userEvent.keyboard('{Escape}')

    expect(onCollapseMock).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape when the nav bar is inline chrome', async () => {
    renderNavBar()
    await screen.findByRole('link', { name: 'Gear' })
    await userEvent.keyboard('{Escape}')
    expect(onCollapseMock).not.toHaveBeenCalled()
  })
})
