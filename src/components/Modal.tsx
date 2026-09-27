import { useRef, type JSX, type ReactNode } from 'react'
import { useModalBehavior } from '../hooks/useModalBehavior'
import './Modal.css'

export type ModalVariant = 'centered' | 'drawer-right'

export interface ModalProps {
  variant: ModalVariant
  onClose: () => void
  labelledBy?: string
  label?: string
  backdropLabel?: string
  className?: string
  children: ReactNode
}

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
