/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useTabFocusWrap } from '../../hooks'
import { isTypingTarget } from '../../lib/isTypingTarget'
import './HoverCard.css'

interface CardEntry {
  id: number
  anchorId: string | null
  anchorElement: HTMLElement | null
  placementElement?: HTMLElement
  kind: string
  depth: number
  anchorRect: DOMRect
  besideRect?: DOMRect
  getBesideElement?: (anchor: HTMLElement) => HTMLElement | null
  pointerOffsetX: number | null
  isRow: boolean
  openedBy: 'pointer' | 'focus'
  placement?: 'beside'
  render: () => ReactNode
  isPinned: boolean
}

export interface HoverCardOptions {
  kind: string
  delayMs: number
  render: () => ReactNode
  placement?: 'beside'
  isRow?: boolean
  getBesideElement?: (anchor: HTMLElement) => HTMLElement | null
}

interface CardController {
  open: (entry: Omit<CardEntry, 'id' | 'isPinned'>, delayMs: number, isPinned?: boolean) => void
  closeFrom: (depth: number) => void
  closeFocusOpenedFrom: (anchorId: string, depth: number) => void
  removeAnchor: (anchorId: string) => void
  clear: () => void
  dismiss: (anchorId: string) => boolean
  isNavigationFocus: (target: EventTarget | null) => boolean
  pinnedAnchorIds: ReadonlySet<string>
}

const ControllerContext = createContext<CardController | null>(null)
const DepthContext = createContext(0)
const NAVIGATION_KEYS = new Set([
  'Tab',
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])
const CARD_VIEWPORT_MARGIN = 8

export function positionedCard({
  anchorRect,
  besideRect,
  pointerX,
  cardWidth,
  cardHeight,
  viewportWidth,
  viewportHeight,
  isRow = false,
}: {
  anchorRect: DOMRect
  besideRect?: DOMRect
  pointerX: number | null
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
  isRow?: boolean
}): { left: number; top: number; maxHeight?: number } {
  const margin = CARD_VIEWPORT_MARGIN
  const gap = 6
  if (isRow && pointerX === null && besideRect) {
    const beside = positionedCardBeside(
      besideRect,
      cardWidth,
      cardHeight,
      viewportWidth,
      viewportHeight,
      anchorRect,
    )
    if (beside) return beside
  }
  const left = Math.max(
    margin,
    Math.min(
      isRow && pointerX !== null ? pointerX + 14 : anchorRect.left,
      viewportWidth - cardWidth - margin,
    ),
  )
  const below = anchorRect.bottom + gap
  const availableBelow = viewportHeight - margin - below
  const availableAbove = anchorRect.top - gap - margin
  const canFitBelow = cardHeight <= availableBelow
  const canFitAbove = cardHeight <= availableAbove
  const isBelow = canFitBelow || (!canFitAbove && availableBelow >= availableAbove)
  const maxHeight =
    canFitBelow || canFitAbove
      ? undefined
      : Math.max(0, Math.min(isBelow ? availableBelow : availableAbove, viewportHeight * 0.7))
  const displayedHeight = maxHeight === undefined ? cardHeight : Math.min(cardHeight, maxHeight)
  return {
    left,
    top: isBelow ? below : anchorRect.top - gap - displayedHeight,
    ...(maxHeight === undefined ? {} : { maxHeight }),
  }
}

export function positionedCardBeside(
  horizontalAnchorRect: DOMRect,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  verticalAnchorRect: DOMRect = horizontalAnchorRect,
): { left: number; top: number } | null {
  const margin = CARD_VIEWPORT_MARGIN
  const right = horizontalAnchorRect.right + margin
  const left = horizontalAnchorRect.left - width - margin
  const cardLeft = right + width + margin <= viewportWidth ? right : left >= margin ? left : null
  if (cardLeft === null) return null
  const displayedHeight = Math.min(height, viewportHeight * 0.7)
  return {
    left: cardLeft,
    top: Math.max(
      margin,
      Math.min(verticalAnchorRect.top, viewportHeight - displayedHeight - margin),
    ),
  }
}

function hasRectChanged(previous: DOMRect, current: DOMRect): boolean {
  return (
    previous.left !== current.left ||
    previous.top !== current.top ||
    previous.width !== current.width ||
    previous.height !== current.height
  )
}

function viewportCappedPosition(
  position: { left: number; top: number; maxHeight?: number },
  viewportHeight: number,
): { left: number; top: number; maxHeight: number } {
  return {
    ...position,
    maxHeight: Math.min(
      position.maxHeight ?? Infinity,
      Math.max(0, viewportHeight - position.top - CARD_VIEWPORT_MARGIN),
    ),
  }
}

function nearestScrollContainer(element: HTMLElement): HTMLElement {
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const style = window.getComputedStyle(ancestor)
    if (/(auto|scroll|overlay)/.test(`${style.overflowX} ${style.overflowY}`)) return ancestor
  }
  return document.body
}

function CardLayer({
  card,
  isTopPinnedCard,
}: {
  card: CardEntry
  isTopPinnedCard: boolean
}): JSX.Element {
  const elementRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  useTabFocusWrap(elementRef, isTopPinnedCard)
  const hasFocusedPinnedCard = useRef(false)
  const [position, setPosition] = useState<{
    left: number
    top: number
    maxHeight?: number
  } | null>(null)
  const placedPosition = useRef<typeof position>(null)
  const cardPosition = useCallback(
    ({ width, height }: { width: number; height: number }) => {
      const placementElement = card.placementElement ?? card.anchorElement
      const anchorRect =
        !card.isPinned && placementElement?.isConnected
          ? placementElement.getBoundingClientRect()
          : card.anchorRect
      if (card.placement === 'beside') {
        const beside = positionedCardBeside(
          anchorRect,
          width,
          height,
          window.innerWidth,
          window.innerHeight,
        )
        return beside
      }
      const besideRect =
        !card.isPinned &&
        card.isRow &&
        card.pointerOffsetX === null &&
        card.anchorElement?.isConnected
          ? (card.getBesideElement?.(card.anchorElement)?.getBoundingClientRect() ?? anchorRect)
          : card.besideRect
      return positionedCard({
        anchorRect,
        besideRect,
        pointerX: card.pointerOffsetX === null ? null : anchorRect.left + card.pointerOffsetX,
        cardWidth: width,
        cardHeight: height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        isRow: card.isRow,
      })
    },
    [card],
  )
  const positionCard = useCallback(() => {
    if (card.isPinned && placedPosition.current) return
    const element = elementRef.current
    const content = contentRef.current
    if (!element || !content) return
    const style = window.getComputedStyle(element)
    const verticalChrome =
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.paddingBottom) || 0) +
      (Number.parseFloat(style.borderTopWidth) || 0) +
      (Number.parseFloat(style.borderBottomWidth) || 0)
    const cardPlacement = cardPosition({
      width: element.getBoundingClientRect().width,
      height: content.getBoundingClientRect().height + verticalChrome,
    })
    const nextPosition =
      card.isPinned && cardPlacement
        ? viewportCappedPosition(cardPlacement, window.innerHeight)
        : cardPlacement
    placedPosition.current = nextPosition
    setPosition(nextPosition)
  }, [card.isPinned, cardPosition])
  const positionElement = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current = element
      if (element) positionCard()
    },
    [positionCard],
  )
  useLayoutEffect(() => {
    if (!placedPosition.current) positionCard()
  }, [positionCard])
  useLayoutEffect(() => {
    if (!card.isPinned || !placedPosition.current) return
    const cappedPosition = viewportCappedPosition(placedPosition.current, window.innerHeight)
    placedPosition.current = cappedPosition
    setPosition(cappedPosition)
  }, [card.isPinned])
  useEffect(() => {
    const placementElement = card.placementElement ?? card.anchorElement
    const element = elementRef.current
    const content = contentRef.current
    if (card.isPinned || !placementElement || !element || !content) return
    const anchorElement = placementElement
    const besideElement =
      card.isRow && card.pointerOffsetX === null
        ? (card.getBesideElement?.(card.anchorElement ?? anchorElement) ?? null)
        : null
    let frameId: number | null = null
    let shouldForcePosition = false
    let previousAnchorRect = anchorElement.getBoundingClientRect()
    let previousBesideRect = besideElement?.getBoundingClientRect() ?? null
    function queuePosition(shouldForce = false): void {
      shouldForcePosition ||= shouldForce
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        const isForced = shouldForcePosition
        shouldForcePosition = false
        const anchorRect = anchorElement.getBoundingClientRect()
        const besideRect = besideElement?.getBoundingClientRect() ?? null
        if (
          isForced ||
          hasRectChanged(previousAnchorRect, anchorRect) ||
          (previousBesideRect !== null && besideRect !== null
            ? hasRectChanged(previousBesideRect, besideRect)
            : previousBesideRect !== besideRect)
        )
          positionCard()
        previousAnchorRect = anchorRect
        previousBesideRect = besideRect
      })
    }
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver((entries) => {
            queuePosition(
              entries.some((entry) => entry.target === element || entry.target === content),
            )
          })
    if (observer) {
      observer.observe(element)
      observer.observe(content)
      observer.observe(anchorElement)
      if (besideElement) observer.observe(besideElement)
      for (let ancestor = anchorElement.parentElement; ancestor; ancestor = ancestor.parentElement)
        observer.observe(ancestor)
    }
    const scrollContainer = nearestScrollContainer(anchorElement)
    const mutationObserver = new MutationObserver((mutations) => {
      if (
        mutations.some((mutation) => {
          const target =
            mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
          const targetCard = target?.closest<HTMLElement>('[data-hover-card]')
          if (targetCard && !targetCard.contains(anchorElement)) return false
          if (mutation.type !== 'childList' || target !== document.body) return true
          const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes]
          return changedNodes.some(
            (node) => !(node instanceof HTMLElement && node.matches('[data-hover-card]')),
          )
        })
      )
        queuePosition()
    })
    mutationObserver.observe(scrollContainer, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })
    const onScroll = (): void => queuePosition()
    const onViewportResize = (): void => queuePosition(true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onViewportResize)
    return () => {
      observer?.disconnect()
      mutationObserver.disconnect()
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onViewportResize)
    }
  }, [card, positionCard])
  useLayoutEffect(() => {
    if (!card.isPinned || !position || hasFocusedPinnedCard.current) return
    const cardElement = elementRef.current
    if (!cardElement) return
    cardElement.focus({ preventScroll: true })
    hasFocusedPinnedCard.current = true
  }, [card.isPinned, position])
  useLayoutEffect(() => {
    if (!card.isPinned) return
    const cardElement = elementRef.current
    return () => {
      if (card.anchorElement?.isConnected && cardElement?.contains(document.activeElement))
        card.anchorElement.focus({ preventScroll: true })
    }
  }, [card.anchorElement, card.isPinned])
  return (
    <DepthContext.Provider value={card.depth + 1}>
      <div
        ref={positionElement}
        role={card.kind === 'hint' ? 'tooltip' : 'dialog'}
        tabIndex={card.isPinned ? -1 : undefined}
        data-hover-card=""
        data-kind={card.kind}
        data-depth={card.depth}
        className={`hover-card${card.kind === 'hint' ? ' hover-card--hint' : ''}${card.isPinned ? ' hover-card--pinned' : ''}`}
        style={{ ...(position ?? { visibility: 'hidden' }), zIndex: 300 + card.depth }}
      >
        {card.kind !== 'hint' && (
          <span className="hover-card__pin-status">
            {card.isPinned ? 'Pinned · Esc' : 'T to pin'}
          </span>
        )}
        <div ref={contentRef} className="hover-card__content">
          {card.render()}
        </div>
      </div>
    </DepthContext.Provider>
  )
}

export function HoverCardProvider({ children }: { children: ReactNode }): JSX.Element {
  const [cards, setCards] = useState<CardEntry[]>([])
  const pendingTimer = useRef<number | null>(null)
  const pendingAnchorId = useRef<string | null>(null)
  const pendingAnchorElement = useRef<HTMLElement | null>(null)
  const pendingOpenedBy = useRef<CardEntry['openedBy'] | null>(null)
  const isNavigationKeyPending = useRef(false)
  const navigationFocusedElement = useRef<EventTarget | null>(null)
  const navigationKeyTimer = useRef<number | null>(null)
  const dismissedFocusAnchor = useRef<HTMLElement | null>(null)
  const cardToPin = useRef<CardEntry | null>(null)
  const nextId = useRef(0)
  const isNavigationFocus = useCallback(
    (target: EventTarget | null) => target !== null && navigationFocusedElement.current === target,
    [],
  )
  const cancelPending = useCallback(() => {
    if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current)
    pendingTimer.current = null
    pendingAnchorId.current = null
    pendingAnchorElement.current = null
    pendingOpenedBy.current = null
  }, [])
  const open = useCallback(
    (entry: Omit<CardEntry, 'id' | 'isPinned'>, delayMs: number, isPinned = false) => {
      if (dismissedFocusAnchor.current === entry.anchorElement) return
      cancelPending()
      pendingAnchorId.current = entry.anchorId
      pendingAnchorElement.current = entry.anchorElement
      pendingOpenedBy.current = entry.openedBy
      pendingTimer.current = window.setTimeout(() => {
        setCards((current) =>
          current.some((card) => card.isPinned && card.depth >= entry.depth)
            ? current
            : [...current.slice(0, entry.depth), { ...entry, id: ++nextId.current, isPinned }],
        )
        pendingTimer.current = null
        pendingAnchorId.current = null
        pendingAnchorElement.current = null
        pendingOpenedBy.current = null
      }, delayMs)
    },
    [cancelPending],
  )
  const closeFrom = useCallback(
    (depth: number) => {
      cancelPending()
      setCards((current) => current.filter((card) => card.depth < depth || card.isPinned))
    },
    [cancelPending],
  )
  const closeFocusOpenedFrom = useCallback(
    (anchorId: string, depth: number) => {
      if (pendingAnchorId.current === anchorId && pendingOpenedBy.current === 'focus')
        cancelPending()
      setCards((current) => {
        const isFocusOpenedCard = current.some(
          (card) => card.anchorId === anchorId && card.depth === depth && card.openedBy === 'focus',
        )
        return isFocusOpenedCard
          ? current.filter((card) => card.depth < depth || card.isPinned)
          : current
      })
    },
    [cancelPending],
  )
  const removeAnchor = useCallback(
    (anchorId: string) => {
      if (pendingAnchorId.current === anchorId) cancelPending()
      setCards((current) => {
        const index = current.findIndex((card) => card.anchorId === anchorId && !card.isPinned)
        return index < 0 ? current : current.slice(0, index)
      })
    },
    [cancelPending],
  )
  const clear = useCallback(() => {
    cancelPending()
    setCards([])
  }, [cancelPending])
  const dismiss = useCallback(
    (anchorId: string): boolean => {
      const index = cards.findIndex((card) => card.anchorId === anchorId)
      if (index < 0) return false
      const card = cards[index]
      cancelPending()
      dismissedFocusAnchor.current = card.openedBy === 'focus' ? card.anchorElement : null
      setCards((current) => current.slice(0, index))
      if (card.isPinned && card.anchorElement?.isConnected)
        card.anchorElement.focus({ preventScroll: true })
      return true
    },
    [cards, cancelPending],
  )
  useLayoutEffect(() => {
    cardToPin.current = null
    function onKeyDown(event: KeyboardEvent): void {
      if (navigationKeyTimer.current !== null) window.clearTimeout(navigationKeyTimer.current)
      navigationFocusedElement.current = null
      isNavigationKeyPending.current = NAVIGATION_KEYS.has(event.key)
      if (isNavigationKeyPending.current)
        navigationKeyTimer.current = window.setTimeout(() => {
          isNavigationKeyPending.current = false
          navigationKeyTimer.current = null
        }, 0)
      else navigationKeyTimer.current = null
      const topCardIndex = cards.reduce(
        (index, card, cardIndex) => (card.kind === 'hint' ? index : cardIndex),
        -1,
      )
      if (event.key === 'Escape') {
        const focusedElement = document.activeElement
        const isFocusInsideDetailPane =
          focusedElement instanceof Element && Boolean(focusedElement.closest('[data-detail-pane]'))
        if (isFocusInsideDetailPane && isTypingTarget(event.target)) return
        if (!event.defaultPrevented && isFocusInsideDetailPane && cards.length > 0) {
          const topCard = cards[cards.length - 1]
          event.preventDefault()
          if (topCard.kind !== 'hint') event.stopImmediatePropagation()
          cancelPending()
          cardToPin.current = null
          if (topCard.anchorElement?.contains(focusedElement))
            dismissedFocusAnchor.current = topCard.anchorElement
          setCards((current) => current.slice(0, -1))
          return
        }
        const requestedPinnedCard = cardToPin.current
        const topPinnedCardIndex = cards.reduce(
          (index, card, cardIndex) => (card.isPinned ? cardIndex : index),
          -1,
        )
        if (requestedPinnedCard || topPinnedCardIndex >= 0) {
          const pinnedCard = requestedPinnedCard ?? cards[topPinnedCardIndex]
          event.preventDefault()
          event.stopImmediatePropagation()
          cancelPending()
          cardToPin.current = null
          setCards((current) => {
            const pinnedCardIndex = current.findIndex((card) => card.id === pinnedCard.id)
            return pinnedCardIndex < 0 ? current : current.slice(0, pinnedCardIndex)
          })
          if (pinnedCard.anchorElement?.isConnected)
            pinnedCard.anchorElement.focus({ preventScroll: true })
        } else {
          const focusedCardIndex = cards.reduce(
            (index, card, cardIndex) =>
              card.anchorElement?.contains(focusedElement) &&
              (card.openedBy === 'focus' || card.anchorElement.matches('.ledger-row'))
                ? cardIndex
                : index,
            -1,
          )
          if (focusedCardIndex < 0) {
            const pendingAnchor = pendingAnchorElement.current
            if (pendingAnchor?.contains(document.activeElement)) {
              cancelPending()
              if (!isFocusInsideDetailPane) {
                event.preventDefault()
                event.stopImmediatePropagation()
                dismissedFocusAnchor.current = pendingAnchor
              }
            }
            return
          }
          const focusedCard = cards[focusedCardIndex]
          if (focusedCard.kind !== 'hint') {
            event.preventDefault()
            event.stopImmediatePropagation()
          }
          cancelPending()
          dismissedFocusAnchor.current = focusedCard.anchorElement
          setCards((current) => current.slice(0, focusedCardIndex))
        }
      } else if (
        event.key.toLowerCase() === 't' &&
        topCardIndex >= 0 &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault()
        cardToPin.current = cards[topCardIndex]
        setCards((current) =>
          current.map((card, index) =>
            index === topCardIndex ? { ...card, isPinned: true } : card,
          ),
        )
      }
    }
    function onFocusIn(event: FocusEvent): void {
      navigationFocusedElement.current = isNavigationKeyPending.current ? event.target : null
      isNavigationKeyPending.current = false
      if (navigationKeyTimer.current !== null) window.clearTimeout(navigationKeyTimer.current)
      navigationKeyTimer.current =
        navigationFocusedElement.current === null
          ? null
          : window.setTimeout(() => {
              navigationFocusedElement.current = null
              navigationKeyTimer.current = null
            }, 0)
    }
    function onPointerDown(): void {
      isNavigationKeyPending.current = false
      navigationFocusedElement.current = null
      if (navigationKeyTimer.current !== null) window.clearTimeout(navigationKeyTimer.current)
      navigationKeyTimer.current = null
    }
    function onMouseDown(event: globalThis.MouseEvent): void {
      const clickedCard =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-hover-card]')
          : null
      if (clickedCard) {
        cancelPending()
        const clickedCardDepth = Number(clickedCard.dataset.depth)
        setCards((current) =>
          current.some((card) => card.depth > clickedCardDepth)
            ? current.filter((card) => card.depth <= clickedCardDepth)
            : current,
        )
      } else if (cards.some((card) => card.isPinned)) {
        cancelPending()
        setCards((current) => {
          const pinnedIndex = current.findIndex((card) => card.isPinned)
          return pinnedIndex < 0 ? current : current.slice(0, pinnedIndex)
        })
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('mousedown', onMouseDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('mousedown', onMouseDown, true)
    }
  }, [cards, cancelPending])

  useEffect(() => {
    function onFocusOut(event: FocusEvent): void {
      const dismissedAnchor = dismissedFocusAnchor.current
      if (
        dismissedAnchor?.contains(event.target as Node) &&
        !dismissedAnchor.contains(event.relatedTarget as Node | null)
      )
        dismissedFocusAnchor.current = null
    }
    document.addEventListener('focusout', onFocusOut)
    return () => document.removeEventListener('focusout', onFocusOut)
  }, [])

  useEffect(() => {
    function openHint(anchor: HTMLElement, openedBy: CardEntry['openedBy']): void {
      const hint = anchor.dataset.tip
      if (!hint) return
      const parentCard = anchor.closest<HTMLElement>('[data-hover-card]')
      const depth = parentCard ? Number(parentCard.dataset.depth) + 1 : 0
      open(
        {
          kind: 'hint',
          anchorId: null,
          anchorElement: anchor,
          depth,
          anchorRect: anchor.getBoundingClientRect(),
          pointerOffsetX: null,
          isRow: false,
          openedBy,
          render: () => hint,
        },
        260,
      )
    }
    function closeHint(anchor: HTMLElement): void {
      if (pendingAnchorElement.current === anchor) cancelPending()
      setCards((current) => {
        const index = current.findIndex(
          (card) => card.kind === 'hint' && card.anchorElement === anchor,
        )
        return index < 0
          ? current
          : current.filter((card, cardIndex) => cardIndex < index || card.isPinned)
      })
    }
    function onMouseOver(event: globalThis.MouseEvent): void {
      const anchor = (event.target as Element).closest<HTMLElement>('[data-tip]')
      if (!anchor || anchor.contains(event.relatedTarget as Node | null)) return
      openHint(anchor, anchor.contains(document.activeElement) ? 'focus' : 'pointer')
    }
    function onMouseOut(event: globalThis.MouseEvent): void {
      const anchor = (event.target as Element).closest<HTMLElement>('[data-tip]')
      if (
        anchor &&
        !anchor.contains(event.relatedTarget as Node | null) &&
        !anchor.contains(document.activeElement)
      )
        closeHint(anchor)
    }
    function onFocusIn(event: FocusEvent): void {
      const anchor = (event.target as Element).closest<HTMLElement>('[data-tip]')
      if (
        anchor &&
        !anchor.contains(event.relatedTarget as Node | null) &&
        isNavigationFocus(event.target)
      )
        openHint(anchor, 'focus')
    }
    function onFocusOut(event: FocusEvent): void {
      const anchor = (event.target as Element).closest<HTMLElement>('[data-tip]')
      if (anchor && !anchor.contains(event.relatedTarget as Node | null)) closeHint(anchor)
    }
    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mouseout', onMouseOut)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mouseout', onMouseOut)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [open, cancelPending, isNavigationFocus])

  const topPinnedCardId = cards.reduce<number | null>(
    (topId, card) => (card.isPinned ? card.id : topId),
    null,
  )
  return (
    <ControllerContext.Provider
      value={{
        open,
        closeFrom,
        closeFocusOpenedFrom,
        removeAnchor,
        clear,
        dismiss,
        isNavigationFocus,
        pinnedAnchorIds: new Set(
          cards.flatMap((card) => (card.isPinned && card.anchorId ? [card.anchorId] : [])),
        ),
      }}
    >
      {children}
      {cards.map((card) =>
        createPortal(
          <CardLayer key={card.id} card={card} isTopPinnedCard={card.id === topPinnedCardId} />,
          document.body,
        ),
      )}
    </ControllerContext.Provider>
  )
}

export function useHoverCard({
  kind,
  delayMs,
  render,
  placement,
  isRow = false,
  getBesideElement,
}: HoverCardOptions): {
  'data-hover-card-pinned': '' | undefined
  onMouseEnter: (event: React.MouseEvent<HTMLElement>) => void
  onMouseLeave: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
  onFocus: (event: React.FocusEvent<HTMLElement>) => void
  onBlur: () => void
} {
  const controller = useContext(ControllerContext)
  const depth = useContext(DepthContext)
  const anchorId = useId()
  const anchorElement = useRef<HTMLElement | null>(null)
  const removeAnchor = controller?.removeAnchor
  useEffect(
    () => () => {
      if (anchorElement.current && !anchorElement.current.isConnected) removeAnchor?.(anchorId)
    },
    [removeAnchor, anchorId],
  )
  return {
    'data-hover-card-pinned': controller?.pinnedAnchorIds.has(anchorId) ? '' : undefined,
    onMouseEnter: (event) => {
      anchorElement.current = event.currentTarget
      const anchorRect = event.currentTarget.getBoundingClientRect()
      controller?.open(
        {
          kind,
          anchorId,
          anchorElement: event.currentTarget,
          depth,
          anchorRect,
          pointerOffsetX: event.clientX - anchorRect.left,
          isRow,
          openedBy: event.currentTarget.contains(document.activeElement) ? 'focus' : 'pointer',
          placement,
          getBesideElement,
          render,
        },
        delayMs,
      )
    },
    onMouseLeave: () => {
      controller?.closeFrom(depth)
    },
    onFocus: (event) => {
      anchorElement.current = event.currentTarget
      if (!controller?.isNavigationFocus(event.target)) return
      const anchorRect = event.currentTarget.getBoundingClientRect()
      controller?.open(
        {
          kind,
          anchorId,
          anchorElement: event.currentTarget,
          depth,
          anchorRect,
          besideRect: isRow
            ? (getBesideElement?.(event.currentTarget)?.getBoundingClientRect() ?? anchorRect)
            : undefined,
          pointerOffsetX: null,
          isRow,
          openedBy: 'focus',
          placement,
          getBesideElement,
          render,
        },
        delayMs,
      )
    },
    onBlur: () => controller?.closeFocusOpenedFrom(anchorId, depth),
    onKeyDown: (event) => {
      if (event.key.toLowerCase() !== 't' || isTypingTarget(event.target)) return
      anchorElement.current = event.currentTarget
      event.preventDefault()
      event.stopPropagation()
      const anchorRect = event.currentTarget.getBoundingClientRect()
      controller?.open(
        {
          kind,
          anchorId,
          anchorElement: event.currentTarget,
          depth,
          anchorRect,
          besideRect: isRow
            ? (getBesideElement?.(event.currentTarget)?.getBoundingClientRect() ?? anchorRect)
            : undefined,
          pointerOffsetX: null,
          isRow,
          openedBy: 'focus',
          placement,
          getBesideElement,
          render,
        },
        0,
        true,
      )
    },
  }
}

export function useHoverCardControl({
  kind,
  delayMs,
  render,
  placement,
  isRow = false,
  getBesideElement,
}: HoverCardOptions): {
  show: (
    anchor: HTMLElement,
    options: { placementAnchor?: HTMLElement; openedBy: CardEntry['openedBy'] },
  ) => void
  hide: () => void
  dismiss: () => boolean
} {
  const controller = useContext(ControllerContext)
  const depth = useContext(DepthContext)
  const anchorId = useId()
  const anchorElement = useRef<HTMLElement | null>(null)
  const removeAnchor = controller?.removeAnchor
  useEffect(
    () => () => {
      if (anchorElement.current && !anchorElement.current.isConnected) removeAnchor?.(anchorId)
    },
    [removeAnchor, anchorId],
  )
  return {
    show: (anchor, options) => {
      anchorElement.current = anchor
      const anchorRect = (options.placementAnchor ?? anchor).getBoundingClientRect()
      controller?.open(
        {
          kind,
          anchorId,
          anchorElement: anchor,
          placementElement: options.placementAnchor,
          depth,
          anchorRect,
          besideRect:
            isRow && options.openedBy === 'focus'
              ? (getBesideElement?.(anchor)?.getBoundingClientRect() ?? anchorRect)
              : undefined,
          getBesideElement,
          pointerOffsetX: null,
          isRow,
          openedBy: options.openedBy,
          placement,
          render,
        },
        delayMs,
      )
    },
    hide: () => controller?.closeFrom(depth),
    dismiss: () => controller?.dismiss(anchorId) ?? false,
  }
}

export function useClearHoverCards(): () => void {
  const controller = useContext(ControllerContext)
  return controller?.clear ?? (() => {})
}

export function HintAnchor({ text, children }: { text: string; children: ReactNode }): JSX.Element {
  return <span data-tip={text}>{children}</span>
}
