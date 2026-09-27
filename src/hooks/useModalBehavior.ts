import { useEffect, useRef, type RefObject } from 'react'
import { useModalActive } from './useModalActive'

export interface ModalBehaviorOptions {
  active: boolean
  onClose: () => void
  panelRef: RefObject<HTMLElement | null>
  registerActive?: boolean
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useModalBehavior({
  active,
  onClose,
  panelRef,
  registerActive,
}: ModalBehaviorOptions): void {
  useModalActive(registerActive !== false && active)

  /* eslint-disable react-hooks/refs -- Render-phase ref access is the point
     here, not an oversight: the capture has to happen before the commit
     phase, and neither ref feeds the rendered output (nothing below reads
     them during render), which is the staleness the rule guards against. */
  const prevActive = useRef(false)
  const restoreRef = useRef<HTMLElement | null>(null)
  if (active && !prevActive.current) {
    restoreRef.current = document.activeElement as HTMLElement | null
  }
  prevActive.current = active
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (!active) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Escape') return
      if (e.isComposing) return
      e.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, onClose])

  useEffect(() => {
    if (!active) return
    const restoreTarget = restoreRef.current
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      if (restoreTarget?.isConnected) restoreTarget.focus()
    }
  }, [active, panelRef])

  useEffect(() => {
    if (!active) return
    const panel = panelRef.current
    if (!panel) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const focused = document.activeElement
      if (e.shiftKey) {
        if (focused === first || focused === panel) {
          e.preventDefault()
          last.focus()
        }
      } else if (focused === last) {
        e.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [active, panelRef])
}
