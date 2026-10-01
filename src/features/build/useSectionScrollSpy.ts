import { useEffect, type RefObject } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'

const READING_BAND_ROOT_MARGIN = '0px 0px -90% 0px'

interface ObservedSection {
  id: string
  element: Element
}

function observedSectionsOf(sectionIds: readonly string[]): ObservedSection[] {
  return sectionIds.flatMap((sectionId) => {
    const header = document.getElementById(sectionId)
    const element = header?.closest('section') ?? header
    return element ? [{ id: sectionId, element }] : []
  })
}

export function useSectionScrollSpy(
  sectionIds: readonly string[],
  pageEndRef: RefObject<HTMLElement | null>,
): void {
  const router = useRouter()
  const navigate = useNavigate()

  useEffect(() => {
    const pageEnd = pageEndRef.current
    const sections = observedSectionsOf(sectionIds)
    if (!pageEnd || sections.length === 0) return
    const sectionIdByElement = new Map(sections.map(({ id, element }) => [element, id]))

    const sectionIdsInReadingBand = new Set<string>()
    const sectionIdsOnScreen = new Set<string>()
    let isPageEndOnScreen = false
    let sectionIdMarkedByScrolling: string | null = null
    let pendingMarkTimeoutId: ReturnType<typeof setTimeout> | undefined

    function markScrolledToSectionCurrentOnceObserversSettle(): void {
      clearTimeout(pendingMarkTimeoutId)
      pendingMarkTimeoutId = setTimeout(markScrolledToSectionCurrent, 0)
    }

    function lastSectionIdAmong(visibleSectionIds: Set<string>): string | undefined {
      return sectionIds.filter((sectionId) => visibleSectionIds.has(sectionId)).at(-1)
    }

    function sectionIdToMarkCurrent(currentSectionId: string): string | undefined {
      if (!isPageEndOnScreen) return lastSectionIdAmong(sectionIdsInReadingBand)
      const isPickedSection = currentSectionId !== sectionIdMarkedByScrolling
      if (isPickedSection && sectionIdsOnScreen.has(currentSectionId)) return currentSectionId
      return lastSectionIdAmong(sectionIdsOnScreen)
    }

    function markScrolledToSectionCurrent(): void {
      const currentSectionId = router.state.location.hash
      const nextCurrentSectionId = sectionIdToMarkCurrent(currentSectionId)
      if (!nextCurrentSectionId || nextCurrentSectionId === currentSectionId) return
      sectionIdMarkedByScrolling = nextCurrentSectionId
      void navigate({
        to: '/build-plan',
        hash: nextCurrentSectionId,
        replace: true,
        hashScrollIntoView: false,
      })
    }

    function recordIntersections(
      entries: IntersectionObserverEntry[],
      visibleSectionIds: Set<string>,
    ): void {
      for (const entry of entries) {
        if (entry.target === pageEnd) {
          isPageEndOnScreen = entry.isIntersecting
          continue
        }
        const sectionId = sectionIdByElement.get(entry.target)
        if (!sectionId) continue
        if (entry.isIntersecting) visibleSectionIds.add(sectionId)
        else visibleSectionIds.delete(sectionId)
      }
    }

    const readingBandObserver = new IntersectionObserver(
      (entries) => {
        recordIntersections(entries, sectionIdsInReadingBand)
        markScrolledToSectionCurrentOnceObserversSettle()
      },
      { rootMargin: READING_BAND_ROOT_MARGIN },
    )
    const screenObserver = new IntersectionObserver((entries) => {
      recordIntersections(entries, sectionIdsOnScreen)
      markScrolledToSectionCurrentOnceObserversSettle()
    })
    for (const { element } of sections) {
      readingBandObserver.observe(element)
      screenObserver.observe(element)
    }
    screenObserver.observe(pageEnd)
    return () => {
      clearTimeout(pendingMarkTimeoutId)
      readingBandObserver.disconnect()
      screenObserver.disconnect()
    }
  }, [sectionIds, pageEndRef, router, navigate])
}
