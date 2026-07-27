import { useRef, type JSX, type ReactNode } from 'react'
import { useModalBehavior } from '../hooks/useModalBehavior'
import './Modal.css'

/** `centered` — small dialog floating mid-viewport (confirmations).
 *  `drawer-right` — full-height panel pinned to the right edge, full-screen
 *  below 900px (resource details). A `sheet-bottom` variant is reserved for
 *  the mobile patterns Phase 5+ needs. */
export type ModalVariant = 'centered' | 'drawer-right'

export interface ModalProps {
  variant: ModalVariant
  /** Fired by both dismissals: backdrop click and Escape. */
  onClose: () => void
  /** Id of an element inside `children` that names the dialog. Preferred over
   *  `label` — point it at the content's heading so the dialog announces what
   *  it's showing. Falls through to `label` when the id doesn't resolve. */
  labelledBy?: string
  /** Accessible name used when `labelledBy` is absent or unresolvable. */
  label?: string
  /** Accessible name for the backdrop button. Defaults to 'Close dialog'.
   *  Give it a distinct name when the dialog also renders a visible close /
   *  cancel control, so role queries don't collide. */
  backdropLabel?: string
  /** Extra class(es) on the panel — consumers own their sizing and padding.
   *  Modal.css loads before consumer CSS (imported here), and every panel
   *  rule is a single flat class, so an equal-specificity consumer rule wins. */
  className?: string
  children: ReactNode
}

/**
 * Modal shell: backdrop + dialog panel, with Escape / focus / Tab-trap
 * behavior from `useModalBehavior`.
 *
 * Mount === open. There's no `open` prop — render it conditionally
 * (`{isOpen && <Modal …>}`) so mounting is the single source of truth for
 * "is this modal on screen", and unmount cleanup is the single teardown path.
 *
 * Backdrop and panel render as fragment siblings: no wrapper element (a
 * wrapper would need its own positioning + stacking context, which is what
 * the two `position: fixed` children already own) and no portal (both are
 * fixed-position in the root stacking context, so DOM position doesn't affect
 * where they paint).
 */
export function Modal({
  variant,
  onClose,
  labelledBy,
  label,
  backdropLabel = 'Close dialog',
  className,
  children,
}: ModalProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null)
  useModalBehavior({ active: true, onClose, panelRef })

  return (
    <>
      <button
        type="button"
        className={`modal-backdrop modal-backdrop--${variant}`}
        onClick={onClose}
        aria-label={backdropLabel}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        className={`modal-panel modal-panel--${variant}${className ? ` ${className}` : ''}`}
      >
        {children}
      </div>
    </>
  )
}
