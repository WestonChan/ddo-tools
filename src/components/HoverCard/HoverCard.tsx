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
  kind: string
  label?: string
  depth: number
  anchorRect: DOMRect
  pointerX: number | null
  isRow: boolean
  openedBy: 'pointer' | 'focus'
  placement?: 'beside'
  render: () => ReactNode
  isPinned: boolean
}

export interface HoverCardOptions {
  kind: string
  label?: string
  delayMs: number
  render: () => ReactNode
  placement?: 'beside'
  isRow?: boolean
}

interface CardController {
  open: (entry: Omit<CardEntry, 'id' | 'isPinned'>, delayMs: number, isPinned?: boolean) => void
  closeFrom: (depth: number) => void
  removeAnchor: (anchorId: string) => void
  clear: () => void
  dismiss: (anchorId: string) => boolean
  setLabel: (cardId: number, label: string) => void
  isNavigationFocus: (target: EventTarget | null) => boolean
  pinnedAnchorIds: ReadonlySet<string>
}

const ControllerContext = createContext<CardController | null>(null)
const DepthContext = createContext(0)
const CardLabelContext = createContext<((label: string) => void) | null>(null)
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

export function positionedCard({
  anchorRect,
  pointerX,
  cardWidth,
  cardHeight,
  viewportWidth,
  viewportHeight,
  isRow = false,
}: {
  anchorRect: DOMRect
  pointerX: number | null
  cardWidth: number
  cardHeight: number
  viewportWidth: number
  viewportHeight: number
  isRow?: boolean
}): { left: number; top: number; maxHeight?: number } {
  const margin = 8
  const gap = 6
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
  menu: DOMRect,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
): { left: number; top: number } | null {
  const margin = 8
  const right = menu.right + margin
  const left = menu.left - width - margin
  const cardLeft = right + width + margin <= viewportWidth ? right : left >= margin ? left : null
  if (cardLeft === null) return null
  return {
    left: cardLeft,
    top: Math.max(margin, Math.min(menu.top, viewportHeight - height - margin)),
  }
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
  const setCardLabel = useContext(ControllerContext)?.setLabel
  const setLabel = useCallback(
    (label: string) => setCardLabel?.(card.id, label),
    [card.id, setCardLabel],
  )
  const [position, setPosition] = useState<{
    left: number
    top: number
    maxHeight?: number
  } | null>(null)
  const cardPosition = useCallback(
    ({ width, height }: { width: number; height: number }) => {
      if (
        card.placement === 'beside' ||
        (card.isRow && card.openedBy === 'focus' && card.pointerX === null)
      ) {
        const beside = positionedCardBeside(
          card.anchorRect,
          width,
          height,
          window.innerWidth,
          window.innerHeight,
        )
        if (beside || card.placement === 'beside') return beside
      }
      return positionedCard({
        anchorRect: card.anchorRect,
        pointerX: card.pointerX,
        cardWidth: width,
        cardHeight: height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        isRow: card.isRow,
      })
    },
    [card.anchorRect, card.placement, card.pointerX, card.isRow, card.openedBy],
  )
  const positionCard = useCallback(() => {
    const element = elementRef.current
    const content = contentRef.current
    if (!element || !content) return
    const style = window.getComputedStyle(element)
    const verticalChrome =
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.paddingBottom) || 0) +
      (Number.parseFloat(style.borderTopWidth) || 0) +
      (Number.parseFloat(style.borderBottomWidth) || 0)
    setPosition(
      cardPosition({
        width: element.getBoundingClientRect().width,
        height: content.getBoundingClientRect().height + verticalChrome,
      }),
    )
  }, [cardPosition])
  const positionElement = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current = element
      if (element) positionCard()
    },
    [positionCard],
  )
  useEffect(() => {
    const element = elementRef.current
    const content = contentRef.current
    if (!element || !content || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(positionCard)
    observer.observe(element)
    observer.observe(content)
    return () => observer.disconnect()
  }, [positionCard])
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
        <div ref={contentRef} className="hover-card__content">
          {card.kind !== 'hint' && (
            <div className="hover-card__status">
              <span className="section-label">{card.label ?? card.kind}</span>
              <span>{card.isPinned ? 'Pinned · Esc' : 'T to pin'}</span>
            </div>
          )}
          <CardLabelContext.Provider value={setLabel}>{card.render()}</CardLabelContext.Provider>
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
  }, [])
  const open = useCallback(
    (entry: Omit<CardEntry, 'id' | 'isPinned'>, delayMs: number, isPinned = false) => {
      if (dismissedFocusAnchor.current === entry.anchorElement) return
      cancelPending()
      pendingAnchorId.current = entry.anchorId
      pendingAnchorElement.current = entry.anchorElement
      pendingTimer.current = window.setTimeout(() => {
        setCards((current) =>
          current.some((card) => card.isPinned && card.depth >= entry.depth)
            ? current
            : [...current.slice(0, entry.depth), { ...entry, id: ++nextId.current, isPinned }],
        )
        pendingTimer.current = null
        pendingAnchorId.current = null
        pendingAnchorElement.current = null
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
  const setLabel = useCallback((cardId: number, label: string) => {
    setCards((current) => {
      const index = current.findIndex((card) => card.id === cardId)
      if (index < 0 || current[index].label === label) return current
      return current.map((card, cardIndex) => (cardIndex === index ? { ...card, label } : card))
    })
  }, [])

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
          pointerX: null,
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
        removeAnchor,
        clear,
        dismiss,
        setLabel,
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
  label,
  delayMs,
  render,
  placement,
  isRow = false,
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
      controller?.open(
        {
          kind,
          label,
          anchorId,
          anchorElement: event.currentTarget,
          depth,
          anchorRect: event.currentTarget.getBoundingClientRect(),
          pointerX: event.clientX,
          isRow,
          openedBy: event.currentTarget.contains(document.activeElement) ? 'focus' : 'pointer',
          placement,
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
      controller?.open(
        {
          kind,
          label,
          anchorId,
          anchorElement: event.currentTarget,
          depth,
          anchorRect: event.currentTarget.getBoundingClientRect(),
          pointerX: null,
          isRow,
          openedBy: 'focus',
          placement,
          render,
        },
        delayMs,
      )
    },
    onBlur: () => controller?.closeFrom(depth),
    onKeyDown: (event) => {
      if (event.key.toLowerCase() !== 't' || isTypingTarget(event.target)) return
      anchorElement.current = event.currentTarget
      event.preventDefault()
      event.stopPropagation()
      controller?.open(
        {
          kind,
          label,
          anchorId,
          anchorElement: event.currentTarget,
          depth,
          anchorRect: event.currentTarget.getBoundingClientRect(),
          pointerX: null,
          isRow,
          openedBy: 'focus',
          placement,
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
  label,
  delayMs,
  render,
  placement,
  isRow = false,
}: HoverCardOptions): {
  show: (
    anchor: HTMLElement,
    options: { rect?: DOMRect; statusLabel?: string; openedBy: CardEntry['openedBy'] },
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
      controller?.open(
        {
          kind,
          label: options.statusLabel ?? label,
          anchorId,
          anchorElement: anchor,
          depth,
          anchorRect: options.rect ?? anchor.getBoundingClientRect(),
          pointerX: null,
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

export function useHoverCardLabel(label: string | null): void {
  const setLabel = useContext(CardLabelContext)
  useEffect(() => {
    if (label) setLabel?.(label)
  }, [label, setLabel])
}

export function HintAnchor({ text, children }: { text: string; children: ReactNode }): JSX.Element {
  return <span data-tip={text}>{children}</span>
}
