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
  openedBy: 'pointer' | 'focus'
  render: () => ReactNode
  isPinned: boolean
}

export interface HoverCardOptions {
  kind: string
  label?: string
  delayMs: number
  render: () => ReactNode
}

interface CardController {
  open: (entry: Omit<CardEntry, 'id' | 'isPinned'>, delayMs: number, isPinned?: boolean) => void
  closeFrom: (depth: number) => void
  removeAnchor: (anchorId: string) => void
  clear: () => void
  restoreAnchorFocus: (anchor: HTMLElement) => void
  isRestoringAnchorFocus: (anchor: HTMLElement) => boolean
  pinnedAnchorIds: ReadonlySet<string>
}

const ControllerContext = createContext<CardController | null>(null)
const DepthContext = createContext(0)

export function positionedCard(
  anchor: DOMRect,
  pointerX: number | null,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
): { left: number; top: number } {
  const margin = 8
  const left = Math.max(
    margin,
    Math.min(pointerX === null ? anchor.left : pointerX + 14, viewportWidth - width - margin),
  )
  const below = anchor.bottom + 6
  const above = anchor.top - height - 6
  const preferredTop = below + height + margin <= viewportHeight ? below : above
  return { left, top: Math.max(margin, Math.min(preferredTop, viewportHeight - height - margin)) }
}

function CardLayer({ card }: { card: CardEntry }): JSX.Element {
  const elementRef = useRef<HTMLDivElement>(null)
  const hasFocusedPinnedCard = useRef(false)
  const restoreAnchorFocus = useContext(ControllerContext)?.restoreAnchorFocus
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const positionElement = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current = element
      if (!element) return
      const rect = element.getBoundingClientRect()
      setPosition(
        positionedCard(
          card.anchorRect,
          card.pointerX,
          rect.width,
          rect.height,
          window.innerWidth,
          window.innerHeight,
        ),
      )
    },
    [card.anchorRect, card.pointerX],
  )
  useEffect(() => {
    if (!elementRef.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const rect = elementRef.current?.getBoundingClientRect()
      if (rect)
        setPosition(
          positionedCard(
            card.anchorRect,
            card.pointerX,
            rect.width,
            rect.height,
            window.innerWidth,
            window.innerHeight,
          ),
        )
    })
    observer.observe(elementRef.current)
    return () => observer.disconnect()
  }, [card.anchorRect, card.pointerX])
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
        restoreAnchorFocus?.(card.anchorElement)
    }
  }, [card.anchorElement, card.isPinned, restoreAnchorFocus])
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
          <div className="hover-card__status">
            <span className="section-label">{card.label ?? card.kind}</span>
            <span>{card.isPinned ? 'Pinned · Esc' : 'T to pin'}</span>
          </div>
        )}
        {card.render()}
      </div>
    </DepthContext.Provider>
  )
}

export function HoverCardProvider({ children }: { children: ReactNode }): JSX.Element {
  const [cards, setCards] = useState<CardEntry[]>([])
  const pendingTimer = useRef<number | null>(null)
  const pendingAnchorId = useRef<string | null>(null)
  const restoringAnchor = useRef<HTMLElement | null>(null)
  const dismissedFocusAnchor = useRef<HTMLElement | null>(null)
  const nextId = useRef(0)
  const restoreAnchorFocus = useCallback((anchor: HTMLElement) => {
    restoringAnchor.current = anchor
    anchor.focus({ preventScroll: true })
    restoringAnchor.current = null
  }, [])
  const isRestoringAnchorFocus = useCallback(
    (anchor: HTMLElement) => restoringAnchor.current === anchor,
    [],
  )
  const cancelPending = useCallback(() => {
    if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current)
    pendingTimer.current = null
    pendingAnchorId.current = null
  }, [])
  const open = useCallback(
    (entry: Omit<CardEntry, 'id' | 'isPinned'>, delayMs: number, isPinned = false) => {
      if (dismissedFocusAnchor.current === entry.anchorElement) return
      cancelPending()
      pendingAnchorId.current = entry.anchorId
      pendingTimer.current = window.setTimeout(() => {
        setCards((current) =>
          current.some((card) => card.isPinned && card.depth >= entry.depth)
            ? current
            : [...current.slice(0, entry.depth), { ...entry, id: ++nextId.current, isPinned }],
        )
        pendingTimer.current = null
        pendingAnchorId.current = null
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const topCardIndex = cards.reduce(
        (index, card, cardIndex) => (card.kind === 'hint' ? index : cardIndex),
        -1,
      )
      if (event.key === 'Escape') {
        const topPinnedCardIndex = cards.reduce(
          (index, card, cardIndex) => (card.isPinned ? cardIndex : index),
          -1,
        )
        if (topPinnedCardIndex >= 0) {
          event.preventDefault()
          event.stopImmediatePropagation()
          setCards((current) => current.slice(0, topPinnedCardIndex))
        } else {
          const focusedElement = document.activeElement
          const focusedCardIndex = cards.reduce(
            (index, card, cardIndex) =>
              card.anchorElement?.contains(focusedElement) &&
              (card.openedBy === 'focus' || card.anchorElement.matches('.ledger-row'))
                ? cardIndex
                : index,
            -1,
          )
          if (focusedCardIndex < 0) return
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
        setCards((current) =>
          current.map((card, index) =>
            index === topCardIndex ? { ...card, isPinned: true } : card,
          ),
        )
      }
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
    document.addEventListener('mousedown', onMouseDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
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
          openedBy,
          render: () => hint,
        },
        260,
      )
    }
    function closeHint(anchor: HTMLElement): void {
      const parentCard = anchor.closest<HTMLElement>('[data-hover-card]')
      closeFrom(parentCard ? Number(parentCard.dataset.depth) + 1 : 0)
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
      if (anchor && !anchor.contains(event.relatedTarget as Node | null)) openHint(anchor, 'focus')
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
  }, [open, closeFrom])

  return (
    <ControllerContext.Provider
      value={{
        open,
        closeFrom,
        removeAnchor,
        clear,
        restoreAnchorFocus,
        isRestoringAnchorFocus,
        pinnedAnchorIds: new Set(
          cards.flatMap((card) => (card.isPinned && card.anchorId ? [card.anchorId] : [])),
        ),
      }}
    >
      {children}
      {cards.map((card) => createPortal(<CardLayer key={card.id} card={card} />, document.body))}
    </ControllerContext.Provider>
  )
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

export function useHoverCard({ kind, label, delayMs, render }: HoverCardOptions): {
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
          openedBy: event.currentTarget.contains(document.activeElement) ? 'focus' : 'pointer',
          render,
        },
        delayMs,
      )
    },
    onMouseLeave: () => controller?.closeFrom(depth),
    onFocus: (event) => {
      anchorElement.current = event.currentTarget
      if (controller?.isRestoringAnchorFocus(event.currentTarget)) return
      controller?.open(
        {
          kind,
          label,
          anchorId,
          anchorElement: event.currentTarget,
          depth,
          anchorRect: event.currentTarget.getBoundingClientRect(),
          pointerX: null,
          openedBy: 'focus',
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
          openedBy: 'focus',
          render,
        },
        0,
        true,
      )
    },
  }
}

export function useClearHoverCards(): () => void {
  const controller = useContext(ControllerContext)
  return controller?.clear ?? (() => {})
}

export function HintAnchor({ text, children }: { text: string; children: ReactNode }): JSX.Element {
  return <span data-tip={text}>{children}</span>
}
