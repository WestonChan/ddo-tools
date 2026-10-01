import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { BUILD_PLAN_SECTIONS } from './buildPlanSections'
import { BuildPlanView } from './BuildPlanView'

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void

interface CapturedObserver {
  callback: IntersectionCallback
  rootMargin: string
  observedElements: Element[]
}

let capturedObservers: CapturedObserver[] = []
const scrollIntoViewMock = vi.fn()

class CapturingIntersectionObserver {
  private readonly captured: CapturedObserver
  constructor(callback: IntersectionCallback, options?: IntersectionObserverInit) {
    this.captured = { callback, rootMargin: options?.rootMargin ?? '', observedElements: [] }
    capturedObservers.push(this.captured)
  }
  observe(element: Element): void {
    this.captured.observedElements.push(element)
  }
  unobserve(): void {}
  disconnect(): void {
    capturedObservers = capturedObservers.filter((observer) => observer !== this.captured)
  }
}

const originalIntersectionObserver = globalThis.IntersectionObserver
const originalScrollIntoView = Element.prototype.scrollIntoView

beforeEach(() => {
  capturedObservers = []
  scrollIntoViewMock.mockClear()
  globalThis.IntersectionObserver =
    CapturingIntersectionObserver as unknown as typeof IntersectionObserver
  Element.prototype.scrollIntoView = scrollIntoViewMock
})

afterEach(() => {
  globalThis.IntersectionObserver = originalIntersectionObserver
  Element.prototype.scrollIntoView = originalScrollIntoView
})

function sectionHeader(sectionId: string): HTMLElement {
  const header = document.getElementById(sectionId)
  if (!header) throw new Error(`No section header with id "${sectionId}"`)
  return header
}

function scrolledElements(): unknown[] {
  return scrollIntoViewMock.mock.contexts
}

interface ScrollPosition {
  headersOnScreen: string[]
  sectionsInReadingBand: string[]
  sectionsOnScreen: string[]
  isPageEndOnScreen?: boolean
}

function isReadingBandObserver(observer: CapturedObserver): boolean {
  return observer.rootMargin.includes('%')
}

function isElementIntersecting(
  element: Element,
  observer: CapturedObserver,
  position: ScrollPosition,
): boolean {
  const sectionIds: string[] = BUILD_PLAN_SECTIONS.map((section) => section.id)
  if (sectionIds.includes(element.id)) return position.headersOnScreen.includes(element.id)
  const containedSectionId = sectionIds.find((sectionId) =>
    element.contains(sectionHeader(sectionId)),
  )
  if (!containedSectionId) return !!position.isPageEndOnScreen
  const visibleSectionIds = isReadingBandObserver(observer)
    ? position.sectionsInReadingBand
    : position.sectionsOnScreen
  return visibleSectionIds.includes(containedSectionId)
}

function scrollTo(position: ScrollPosition): void {
  act(() => {
    for (const observer of [...capturedObservers]) {
      observer.callback(
        observer.observedElements.map(
          (target) =>
            ({
              target,
              isIntersecting: isElementIntersecting(target, observer, position),
            }) as IntersectionObserverEntry,
        ),
      )
    }
  })
}

async function settle(): Promise<void> {
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

describe('BuildPlanView', () => {
  it('scrolls the section named by the hash into view on arrival and on every hash change', async () => {
    const { router } = renderWithRouter(<BuildPlanView />, '/build-plan#skills')

    await waitFor(() => expect(scrolledElements()).toContain(sectionHeader('skills')))

    await act(() => router.navigate({ to: '/build-plan', hash: 'enhancements' }))
    await waitFor(() => expect(scrolledElements()).toContain(sectionHeader('enhancements')))
  })

  it('titles one anchored section per Build plan section', async () => {
    renderWithRouter(<BuildPlanView />, '/build-plan')
    for (const section of BUILD_PLAN_SECTIONS) {
      expect(await screen.findByRole('heading', { name: section.label })).toBeInTheDocument()
      expect(sectionHeader(section.id)).toHaveTextContent(section.label)
    }
  })

  it('replaces the hash with the section crossing the reading line as the page scrolls down, without scrolling', async () => {
    const { router } = renderWithRouter(<BuildPlanView />, '/build-plan#levels')
    await waitFor(() => expect(scrolledElements()).toContain(sectionHeader('levels')))
    const historyLengthBeforeScroll = router.history.length
    scrollIntoViewMock.mockClear()

    scrollTo({
      headersOnScreen: ['skills', 'spells'],
      sectionsInReadingBand: ['skills'],
      sectionsOnScreen: ['skills', 'spells'],
    })

    await waitFor(() => expect(router.state.location.hash).toBe('skills'))
    expect(router.history.length).toBe(historyLengthBeforeScroll)
    expect(scrollIntoViewMock).not.toHaveBeenCalled()
  })

  it('moves the hash back to the previous section when the page scrolls up into its body', async () => {
    const { router } = renderWithRouter(<BuildPlanView />, '/build-plan#skills')
    await waitFor(() => expect(scrolledElements()).toContain(sectionHeader('skills')))

    scrollTo({
      headersOnScreen: [],
      sectionsInReadingBand: ['levels'],
      sectionsOnScreen: ['levels'],
    })

    await waitFor(() => expect(router.state.location.hash).toBe('levels'))
  })

  it('leaves the hash alone while no section is on screen', async () => {
    const { router } = renderWithRouter(<BuildPlanView />, '/build-plan#skills')
    await waitFor(() => expect(scrolledElements()).toContain(sectionHeader('skills')))

    scrollTo({ headersOnScreen: [], sectionsInReadingBand: [], sectionsOnScreen: [] })
    await settle()

    expect(router.state.location.hash).toBe('skills')
  })

  it('keeps a picked section current at the end of the page until the page scrolls back up', async () => {
    const { router } = renderWithRouter(<BuildPlanView />, '/build-plan#reaper')
    await waitFor(() => expect(scrolledElements()).toContain(sectionHeader('reaper')))
    const endOfPage: ScrollPosition = {
      headersOnScreen: ['enhancements', 'destinies', 'reaper'],
      sectionsInReadingBand: ['enhancements'],
      sectionsOnScreen: ['enhancements', 'destinies', 'reaper'],
    }

    scrollTo({ ...endOfPage, isPageEndOnScreen: true })
    await settle()
    expect(router.state.location.hash).toBe('reaper')

    scrollTo({ ...endOfPage, isPageEndOnScreen: false })
    await waitFor(() => expect(router.state.location.hash).toBe('enhancements'))
  })

  it('makes the last on-screen section current at the end of the page when the current section has scrolled away', async () => {
    const { router } = renderWithRouter(<BuildPlanView />, '/build-plan#levels')
    await waitFor(() => expect(scrolledElements()).toContain(sectionHeader('levels')))
    const endOfPage: ScrollPosition = {
      headersOnScreen: ['spells', 'enhancements', 'destinies', 'reaper'],
      sectionsInReadingBand: [],
      sectionsOnScreen: ['spells', 'enhancements', 'destinies', 'reaper'],
      isPageEndOnScreen: true,
    }
    const lastOnScreenSectionId = BUILD_PLAN_SECTIONS.map((section) => section.id)
      .filter((sectionId) => endOfPage.sectionsOnScreen.includes(sectionId))
      .at(-1)

    scrollTo(endOfPage)

    await waitFor(() => expect(router.state.location.hash).toBe(lastOnScreenSectionId))
  })

  it('moves past a section it marked itself once the page end comes on screen', async () => {
    const { router } = renderWithRouter(<BuildPlanView />, '/build-plan#levels')
    await waitFor(() => expect(scrolledElements()).toContain(sectionHeader('levels')))
    const nearEndOfPage: ScrollPosition = {
      headersOnScreen: ['destinies', 'reaper'],
      sectionsInReadingBand: ['enhancements'],
      sectionsOnScreen: ['enhancements', 'destinies', 'reaper'],
    }
    scrollTo(nearEndOfPage)
    await waitFor(() => expect(router.state.location.hash).toBe('enhancements'))

    scrollTo({ ...nearEndOfPage, isPageEndOnScreen: true })

    await waitFor(() => expect(router.state.location.hash).toBe('reaper'))
  })
})
