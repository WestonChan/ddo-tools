import { useEffect, useLayoutEffect, useRef, type JSX, type ReactNode, type RefObject } from 'react'
import './AnchoredMenu.css'

export type AnchoredMenuPlacement = 'below' | 'above'

interface AnchoredMenuProps {
  id: string
  anchorRef: RefObject<HTMLElement | null>
  placement: AnchoredMenuPlacement
  widthPx: number
  label: string
  onClose: () => void
  children: ReactNode
}

const ANCHOR_GAP_PX = 4
const MINIMUM_ROOM_BEFORE_FLIPPING_PX = 160
const FOCUSABLE_ROW_SELECTOR = 'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'

function placeMenuAgainstAnchor(
  menu: HTMLElement,
  anchor: HTMLElement,
  requestedPlacement: AnchoredMenuPlacement,
  widthPx: number,
): void {
  const anchorRect = anchor.getBoundingClientRect()
  const roomBelowPx = window.innerHeight - anchorRect.bottom - ANCHOR_GAP_PX
  const roomAbovePx = anchorRect.top - ANCHOR_GAP_PX
  const [requestedRoomPx, otherRoomPx] =
    requestedPlacement === 'below' ? [roomBelowPx, roomAbovePx] : [roomAbovePx, roomBelowPx]
  const shouldFlip =
    requestedRoomPx < MINIMUM_ROOM_BEFORE_FLIPPING_PX && otherRoomPx > requestedRoomPx
  const isBelow = (requestedPlacement === 'below') !== shouldFlip

  const rightmostLeftPx = window.innerWidth - widthPx - ANCHOR_GAP_PX
  menu.style.left = `${Math.max(ANCHOR_GAP_PX, Math.min(anchorRect.left, rightmostLeftPx))}px`
  const roomOnChosenSidePx = isBelow ? roomBelowPx : roomAbovePx
  menu.style.maxHeight = `${Math.max(0, roomOnChosenSidePx - ANCHOR_GAP_PX)}px`
  if (isBelow) {
    menu.style.top = `${anchorRect.bottom + ANCHOR_GAP_PX}px`
    menu.style.bottom = ''
  } else {
    menu.style.bottom = `${window.innerHeight - anchorRect.top + ANCHOR_GAP_PX}px`
    menu.style.top = ''
  }
}

function rowToFocusIn(menu: HTMLElement): HTMLElement | null {
  return (
    menu.querySelector<HTMLElement>('[aria-current]') ??
    menu.querySelector<HTMLElement>(FOCUSABLE_ROW_SELECTOR)
  )
}

export function AnchoredMenu({
  id,
  anchorRef,
  placement,
  widthPx,
  label,
  onClose,
  children,
}: AnchoredMenuProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    function followAnchor(): void {
      const menu = menuRef.current
      const anchor = anchorRef.current
      if (menu && anchor) placeMenuAgainstAnchor(menu, anchor, placement, widthPx)
    }
    followAnchor()
    window.addEventListener('resize', followAnchor)
    window.addEventListener('scroll', followAnchor, true)
    return () => {
      window.removeEventListener('resize', followAnchor)
      window.removeEventListener('scroll', followAnchor, true)
    }
  }, [anchorRef, placement, widthPx])

  useLayoutEffect(() => {
    const menu = menuRef.current
    const anchor = anchorRef.current
    if (menu) rowToFocusIn(menu)?.focus()
    return () => {
      if (menu?.contains(document.activeElement) && anchor?.isConnected) anchor.focus()
    }
  }, [anchorRef])

  useEffect(() => {
    const menu = menuRef.current
    const anchor = anchorRef.current
    function isInsideMenuOrAnchor(node: Node): boolean {
      return !!menu?.contains(node) || !!anchor?.contains(node)
    }
    function closeOnOutsideMousedown(e: MouseEvent): void {
      if (e.target instanceof Node && !isInsideMenuOrAnchor(e.target)) onClose()
    }
    function closeOnEscape(e: KeyboardEvent): void {
      if (e.key !== 'Escape' || e.isComposing) return
      e.stopPropagation()
      onClose()
    }
    function closeOnFocusLeaving(e: FocusEvent): void {
      if (e.relatedTarget instanceof Node && !isInsideMenuOrAnchor(e.relatedTarget)) onClose()
    }
    document.addEventListener('mousedown', closeOnOutsideMousedown)
    document.addEventListener('keydown', closeOnEscape, true)
    menu?.addEventListener('focusout', closeOnFocusLeaving)
    anchor?.addEventListener('focusout', closeOnFocusLeaving)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideMousedown)
      document.removeEventListener('keydown', closeOnEscape, true)
      menu?.removeEventListener('focusout', closeOnFocusLeaving)
      anchor?.removeEventListener('focusout', closeOnFocusLeaving)
    }
  }, [anchorRef, onClose])

  return (
    <div
      ref={menuRef}
      id={id}
      role="group"
      aria-label={label}
      className="anchored-menu"
      style={{ width: widthPx }}
    >
      {children}
    </div>
  )
}
