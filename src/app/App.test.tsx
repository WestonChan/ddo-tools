import { render, screen, waitFor, within, type RenderResult } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { BUILD_PLAN_SECTIONS } from '../features/build'
import { createAppRouter } from '../router'

function renderApp(initialPath = '/build-plan'): RenderResult {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [initialPath] }))
  return render(
    <CharacterProvider>
      <RouterProvider router={router} />
    </CharacterProvider>,
  )
}

const [firstBuildPlanSection] = BUILD_PLAN_SECTIONS

describe('App', () => {
  it('renders the rail and the Build plan sections on /build-plan', async () => {
    renderApp()
    expect(
      await screen.findByRole('heading', { name: firstBuildPlanSection.label }),
    ).toBeInTheDocument()
    const interactiveElements = [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]
    expect(interactiveElements.length).toBeGreaterThanOrEqual(5)
  })

  it('renders the stats panel on build-plan view', async () => {
    renderApp()
    const statsPanel = await screen.findByRole('complementary', { name: 'Stats' })
    expect(
      within(statsPanel).getByRole('tab', { name: 'Stats', selected: true }),
    ).toBeInTheDocument()
  })

  describe('arriving on a Build plan section link', () => {
    const scrollIntoViewMock = vi.fn()
    const originalScrollIntoView = Element.prototype.scrollIntoView
    beforeEach(() => {
      scrollIntoViewMock.mockClear()
      Element.prototype.scrollIntoView = scrollIntoViewMock
    })
    afterEach(() => {
      Element.prototype.scrollIntoView = originalScrollIntoView
    })

    it('scrolls to the section header and marks its rail sub-item current', async () => {
      const skillsSection = BUILD_PLAN_SECTIONS.find((section) => section.id === 'skills')!
      renderApp(`/build-plan#${skillsSection.id}`)

      await waitFor(() =>
        expect(scrollIntoViewMock.mock.contexts).toContain(
          document.getElementById(skillsSection.id),
        ),
      )
      expect(document.getElementById(skillsSection.id)).toHaveTextContent(skillsSection.label)
      expect(screen.getByRole('link', { name: skillsSection.label })).toHaveAttribute(
        'aria-current',
        'page',
      )
      expect(screen.getByRole('link', { name: firstBuildPlanSection.label })).not.toHaveAttribute(
        'aria-current',
      )
    })
  })

  it('shows the stats panel on the build-plan, overview and gear views only', async () => {
    for (const [path, shouldShowStatsPanel] of [
      ['/build-plan', true],
      ['/overview', true],
      ['/gear', true],
      ['/characters', false],
      ['/settings', false],
    ] as const) {
      const { unmount } = renderApp(path)
      await screen.findByRole('link', { name: 'Gear' })
      await waitFor(() =>
        expect(!!screen.queryByRole('complementary', { name: 'Stats' })).toBe(shouldShowStatsPanel),
      )
      unmount()
    }
  })
})
