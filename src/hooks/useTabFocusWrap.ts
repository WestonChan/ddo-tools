import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useTabFocusWrap(panelRef: RefObject<HTMLElement | null>, isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return
    const panel = panelRef.current
    if (!panel) return
    const wrapTabFocus = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return
      const focusableControls = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusableControls.length === 0) {
        event.preventDefault()
        return
      }
      const firstControl = focusableControls[0]
      const lastControl = focusableControls[focusableControls.length - 1]
      const focusedElement = document.activeElement
      if (event.shiftKey) {
        if (focusedElement === firstControl || focusedElement === panel) {
          event.preventDefault()
          lastControl.focus()
        }
      } else if (focusedElement === lastControl) {
        event.preventDefault()
        firstControl.focus()
      }
    }
    panel.addEventListener('keydown', wrapTabFocus)
    return () => panel.removeEventListener('keydown', wrapTabFocus)
  }, [isActive, panelRef])
}
