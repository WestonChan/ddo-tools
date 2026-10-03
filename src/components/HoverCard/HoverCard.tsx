/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
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
  kind: string
  depth: number
  anchorRect: DOMRect
  pointerX: number | null
  render: () => ReactNode
  isPinned: boolean
}

export interface HoverCardOptions {
  kind: string
  delayMs: number
  render: () => ReactNode
}

interface CardController {
  open: (entry: Omit<CardEntry, 'id' | 'isPinned'>, delayMs: number, isPinned?: boolean) => void
  closeFrom: (depth: number) => void
  removeAnchor: (anchorId: string) => void
  clear: () => void
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
  return (
    <DepthContext.Provider value={card.depth + 1}>
      <div
        ref={positionElement}
        role={card.kind === 'hint' ? 'tooltip' : 'dialog'}
        data-hover-card=""
        data-kind={card.kind}
        data-depth={card.depth}
        className={`hover-card${card.kind === 'hint' ? ' hover-card--hint' : ''}${card.isPinned ? ' hover-card--pinned' : ''}`}
        style={{ ...(position ?? { visibility: 'hidden' }), zIndex: 300 + card.depth }}
      >
        {card.kind !== 'hint' && (
          <div className="hover-card__status">
            <span className="section-label">{card.kind}</span>
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
  const nextId = useRef(0)
  const cancelPending = useCallback(() => {
    if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current)
    pendingTimer.current = null
    pendingAnchorId.current = null
  }, [])
  const open = useCallback(
    (entry: Omit<CardEntry, 'id' | 'isPinned'>, delayMs: number, isPinned = false) => {
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
        if (topCardIndex >= 0) {
          event.preventDefault()
          event.stopImmediatePropagation()
          setCards((current) => current.slice(0, topCardIndex))
        } else if (cards.length) setCards([])
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
      if (!(event.target as Element).closest('[data-hover-card]')) clear()
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('mousedown', onMouseDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('mousedown', onMouseDown, true)
    }
  }, [cards, clear])

  useEffect(() => {
    function onMouseOver(event: globalThis.MouseEvent): void {
      const anchor = (event.target as Element).closest<HTMLElement>('[data-tip]')
      if (!anchor || anchor.contains(event.relatedTarget as Node | null) || !anchor.dataset.tip)
        return
      const hint = anchor.dataset.tip
      const parentCard = anchor.closest<HTMLElement>('[data-hover-card]')
      const depth = parentCard ? Number(parentCard.dataset.depth) + 1 : 0
      open(
        {
          kind: 'hint',
          anchorId: null,
          depth,
          anchorRect: anchor.getBoundingClientRect(),
          pointerX: null,
          render: () => hint,
        },
        260,
      )
    }
    function onMouseOut(event: globalThis.MouseEvent): void {
      const anchor = (event.target as Element).closest<HTMLElement>('[data-tip]')
      if (anchor && !anchor.contains(event.relatedTarget as Node | null)) {
        const parentCard = anchor.closest<HTMLElement>('[data-hover-card]')
        closeFrom(parentCard ? Number(parentCard.dataset.depth) + 1 : 0)
      }
    }
    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mouseout', onMouseOut)
    return () => {
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mouseout', onMouseOut)
    }
  }, [open, closeFrom])

  return (
    <ControllerContext.Provider value={{ open, closeFrom, removeAnchor, clear }}>
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

export function useHoverCard({ kind, delayMs, render }: HoverCardOptions): {
  onMouseEnter: (event: React.MouseEvent<HTMLElement>) => void
  onMouseLeave: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
  onFocus: (event: React.FocusEvent<HTMLElement>) => void
  onBlur: () => void
} {
  const controller = useContext(ControllerContext)
  const depth = useContext(DepthContext)
  const anchorId = useId()
  const removeAnchor = controller?.removeAnchor
  useEffect(() => () => removeAnchor?.(anchorId), [removeAnchor, anchorId])
  return {
    onMouseEnter: (event) =>
      controller?.open(
        {
          kind,
          anchorId,
          depth,
          anchorRect: event.currentTarget.getBoundingClientRect(),
          pointerX: event.clientX,
          render,
        },
        delayMs,
      ),
    onMouseLeave: () => controller?.closeFrom(depth),
    onFocus: (event) =>
      controller?.open(
        {
          kind,
          anchorId,
          depth,
          anchorRect: event.currentTarget.getBoundingClientRect(),
          pointerX: null,
          render,
        },
        0,
      ),
    onBlur: () => controller?.closeFrom(depth),
    onKeyDown: (event) => {
      if (event.key.toLowerCase() !== 't' || isTypingTarget(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      controller?.open(
        {
          kind,
          anchorId,
          depth,
          anchorRect: event.currentTarget.getBoundingClientRect(),
          pointerX: null,
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
