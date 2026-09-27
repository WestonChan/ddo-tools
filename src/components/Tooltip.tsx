import { useCallback, useState, type JSX } from 'react'
import { createPortal } from 'react-dom'

export type TooltipPlacement = 'bottom' | 'right'

export function Tooltip({
  text,
  anchor,
  placement = 'bottom',
}: {
  text: string
  anchor: DOMRect
  placement?: TooltipPlacement
}): JSX.Element {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const measure = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      const tip = el.getBoundingClientRect()
      const pad = 8
      let top: number
      let left: number

      if (placement === 'right') {
        left = anchor.right + 6
        top = anchor.top + anchor.height / 2 - tip.height / 2

        if (left + tip.width + pad > window.innerWidth) {
          left = anchor.left - tip.width - 6
        }

        top = Math.max(pad, Math.min(top, window.innerHeight - tip.height - pad))
      } else {
        top = anchor.bottom + 6
        if (top + tip.height + pad > window.innerHeight) {
          top = anchor.top - tip.height - 6
        }

        left = anchor.left + anchor.width / 2 - tip.width / 2
        left = Math.max(pad, Math.min(left, window.innerWidth - tip.width - pad))
      }

      setPos({ top, left })
    },
    [anchor, placement],
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

export function TooltipWrapper({
  text,
  children,
  placement,
}: {
  text: string
  children: React.ReactNode
  placement?: TooltipPlacement
}): JSX.Element {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  return (
    <span
      onMouseEnter={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      {children}
      {anchor && <Tooltip text={text} anchor={anchor} placement={placement} />}
    </span>
  )
}
