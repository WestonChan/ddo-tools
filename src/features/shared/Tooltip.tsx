import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Portal-based tooltip that positions itself relative to an anchor rect.
 * Appears below the anchor by default, flips above if no room.
 * Clamps horizontally to stay within the viewport.
 */
export function Tooltip({ text, anchor }: { text: string; anchor: DOMRect }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const measure = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      const tip = el.getBoundingClientRect()
      const pad = 8

      // Try below first, then above if no room
      let top = anchor.bottom + 6
      if (top + tip.height + pad > window.innerHeight) {
        top = anchor.top - tip.height - 6
      }

      // Center horizontally, clamp to viewport
      let left = anchor.left + anchor.width / 2 - tip.width / 2
      left = Math.max(pad, Math.min(left, window.innerWidth - tip.width - pad))

      setPos({ top, left })
    },
    [anchor],
  )

  return createPortal(
    <div
      ref={measure}
      className="tooltip-portal"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' as const }}
    >
      {text}
    </div>,
    document.body,
  )
}

/**
 * Wraps children with hover-triggered tooltip behavior.
 * Shows the tooltip on mouseEnter, hides on mouseLeave.
 */
export function TooltipWrapper({ text, children }: { text: string; children: React.ReactNode }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  return (
    <span
      onMouseEnter={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      {children}
      {anchor && <Tooltip text={text} anchor={anchor} />}
    </span>
  )
}
