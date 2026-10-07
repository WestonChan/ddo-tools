import { useEffect, useRef, type RefObject } from 'react'
import { useRegisterActiveModal } from './useRegisterActiveModal'
import { useTabFocusWrap } from './useTabFocusWrap'

export interface ModalAccessibilityOptions {
  isActive: boolean
  onClose: () => void
  panelRef: RefObject<HTMLElement | null>
  shouldRegisterAsActiveModal?: boolean
}

export function useModalAccessibility({
  isActive,
  onClose,
  panelRef,
  shouldRegisterAsActiveModal,
}: ModalAccessibilityOptions): void {
  useRegisterActiveModal(shouldRegisterAsActiveModal !== false && isActive)
  useTabFocusWrap(panelRef, isActive)

  /* eslint-disable react-hooks/refs -- Render-phase ref access is the point
     here, not an oversight: the capture has to happen before the commit
     phase, and neither ref feeds the rendered output (nothing below reads
     them during render), which is the staleness the rule guards against. */
  const wasActiveRef = useRef(false)
  const focusRestoreTargetRef = useRef<HTMLElement | null>(null)
  if (isActive && !wasActiveRef.current) {
    focusRestoreTargetRef.current = document.activeElement as HTMLElement | null
  }
  wasActiveRef.current = isActive
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (!isActive) return
    function closeOnEscape(e: KeyboardEvent): void {
      if (e.key !== 'Escape') return
      if (e.isComposing) return
      e.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isActive, onClose])

  useEffect(() => {
    if (!isActive) return
    const focusRestoreTarget = focusRestoreTargetRef.current
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      if (focusRestoreTarget?.isConnected) focusRestoreTarget.focus()
    }
  }, [isActive, panelRef])
}
