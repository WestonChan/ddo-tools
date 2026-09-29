import { useCallback, useState, type JSX } from 'react'
import { createPortal } from 'react-dom'

export type TooltipPlacement = 'bottom' | 'right'

export function Tooltip({
  text,
  anchorRect,
  placement = 'bottom',
}: {
  text: string
  anchorRect: DOMRect
  placement?: TooltipPlacement
}): JSX.Element {
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null)

  const positionTooltipBesideAnchor = useCallback(
    (tooltipElement: HTMLDivElement | null) => {
      if (!tooltipElement) return
      const tooltipRect = tooltipElement.getBoundingClientRect()
      const viewportMarginPx = 8
      let top: number
      let left: number

      if (placement === 'right') {
        left = anchorRect.right + 6
        top = anchorRect.top + anchorRect.height / 2 - tooltipRect.height / 2

        if (left + tooltipRect.width + viewportMarginPx > window.innerWidth) {
          left = anchorRect.left - tooltipRect.width - 6
        }

        top = Math.max(viewportMarginPx, Math.min(top, window.innerHeight - tooltipRect.height - viewportMarginPx))
      } else {
        top = anchorRect.bottom + 6
        if (top + tooltipRect.height + viewportMarginPx > window.innerHeight) {
          top = anchorRect.top - tooltipRect.height - 6
        }

        left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2
        left = Math.max(viewportMarginPx, Math.min(left, window.innerWidth - tooltipRect.width - viewportMarginPx))
      }

      setTooltipPosition({ top, left })
    },
    [anchorRect, placement],
  )

  return createPortal(
    <div
      ref={positionTooltipBesideAnchor}
      className="tooltip-portal"
      style={tooltipPosition ? { top: tooltipPosition.top, left: tooltipPosition.left } : { visibility: 'hidden' as const }}
    >
      {text}
    </div>,
    document.body,
  )
}

export function HoverTooltip({
  text,
  children,
  placement,
}: {
  text: string
  children: React.ReactNode
  placement?: TooltipPlacement
}): JSX.Element {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  return (
    <span
      onMouseEnter={(e) => setAnchorRect(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchorRect(null)}
    >
      {children}
      {anchorRect && <Tooltip text={text} anchorRect={anchorRect} placement={placement} />}
    </span>
  )
}
