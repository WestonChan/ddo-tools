import { useEffect, useRef, type RefObject } from 'react'
import { useModalActive } from './useModalActive'

/**
 * The keyboard + focus half of a modal, split out from the `<Modal>`
 * component so overlays that can't adopt Modal's markup can still get the
 * same behavior. `<Modal>` (src/components/Modal.tsx) is the usual entry
 * point; AppNavBar uses the hook directly because its mobile fullscreen
 * overlay is a landmark `<aside>` that stays mounted while collapsed.
 *
 * Engaging the hook does four things while `active`:
 *
 * 1. Registers with the refcounted modal-active store (`useModalActive`) so
 *    AppLayout inerts the background chrome — unless `registerActive: false`.
 * 2. Closes on Escape.
 * 3. Moves focus into the panel, and hands it back on close.
 * 4. Traps Tab inside the panel.
 */
export interface ModalBehaviorOptions {
  /** Engage the behavior. `false` tears everything down as if unmounted. */
  active: boolean
  /** Called when Escape is pressed while active. */
  onClose: () => void
  /** The dialog panel. Needs `tabIndex={-1}` so it can hold focus itself.
   *
   *  Assumed stable: the same DOM node for as long as `active` stays true.
   *  The Tab trap binds its listener to whatever node the ref held at
   *  activation and only rebinds when `active` flips, so swapping the panel
   *  element mid-open (a keyed remount, a conditional wrapper) leaves the
   *  listener on the detached node and the trap silently stops working. */
  panelRef: RefObject<HTMLElement | null>
  /** Defaults to `true`. Set `false` for overlays that must not make the
   *  background chrome inert (the mobile nav overlay IS chrome). */
  registerActive?: boolean
}

// Deliberately not cached: the panel's contents change while it's open
// (breadcrumbs appear, a disabled button enables), and a stale list would
// wrap Tab to an element that no longer exists.
//
// Assumed: nothing inside the panel is a hidden focusable. The selector is
// purely structural — it can't see `display: none`, `visibility: hidden`, an
// `inert` ancestor, or a collapsed details/dialog subtree, so a hidden match
// still counts as first/last and Tab wraps to an element the browser refuses
// to focus (focus ends up on <body>, outside the trap). Consumers must
// unmount hidden controls rather than hide them with CSS.
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

  // Restore target is captured DURING RENDER on the false -> true transition,
  // for two reasons an effect can't cover: a child's `autoFocus` fires in the
  // commit phase (before passive effects), so an effect would record the
  // child instead of the opener; and the hook can activate without mounting,
  // so there's no mount effect to hang it on.
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

  // Escape listener sits on `document` in the BUBBLE phase. Bubble is
  // load-bearing: components with their own dismissable popovers (see
  // StatsMultiSelect in features/resources/components/PickerPanel.tsx)
  // register a CAPTURE-phase document handler that stops propagation, so an
  // open popover swallows the first Escape and the modal stays open.
  //
  // Known limitation: two mounted modals both close on one Escape — each
  // registers its own document listener and neither knows about the other.
  // (The refcount in useModalActive still keeps the background inert
  // correctly.) Nothing stacks modals today; when something does, this needs
  // a "topmost modal only" registry.
  useEffect(() => {
    if (!active) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Escape') return
      // Escape while an IME composition is open cancels the composition, not
      // the dialog — closing here would throw away a half-typed form on a
      // mis-typed kana.
      if (e.isComposing) return
      e.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, onClose])

  // Focus in on activation, focus back out on deactivation. Without this an
  // open modal is a dialog nobody can reach: the background goes inert, so a
  // keyboard user is left on <body> with no announcement and no way out.
  //
  // The restore target is read into a closure local at setup rather than out
  // of the ref at cleanup, and the ref is never cleared. Under <StrictMode>
  // (src/main.tsx) React runs setup -> cleanup -> setup on mount, so a
  // cleanup that consumed the ref would leave the real close with nothing to
  // restore to — focus restore would work in prod and silently do nothing in
  // dev. The synthetic cleanup still bounces focus to the opener and the
  // re-run setup pulls it back to the panel, which is why an `autoFocus`
  // child keeps focus in prod but yields it to the panel in dev.
  useEffect(() => {
    if (!active) return
    const restoreTarget = restoreRef.current
    const panel = panelRef.current
    // Skip when focus already landed inside — a child `autoFocus` (the
    // confirm modal's text input) has priority over the panel.
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      // Runs after the panel is gone and `inert` lifts off the background, so
      // the opener is focusable again — unless it was unmounted meanwhile, in
      // which case focusing it would silently strand focus on a detached node.
      if (restoreTarget?.isConnected) restoreTarget.focus()
    }
  }, [active, panelRef])

  // Tab trap. Native listener on the panel rather than a React handler so it
  // also catches keys from portalled/imperatively-rendered descendants, and
  // so the panel itself (focused via tabIndex={-1}) is a valid event target.
  useEffect(() => {
    if (!active) return
    const panel = panelRef.current
    if (!panel) return
    // Arrow function, not a hoisted `function` declaration: hoisting would
    // drop TS's non-null narrowing of `panel` inside the body.
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusables.length === 0) {
        // Nothing to move to — park focus on the panel instead of letting Tab
        // walk out into the inert background.
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const focused = document.activeElement
      if (e.shiftKey) {
        // The panel itself counts as "before the first control".
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
