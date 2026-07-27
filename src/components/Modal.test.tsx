import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode, type JSX, type ReactNode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'
import { useAnyModalActive, _resetModalActiveForTests } from '../hooks/useModalActive'

// Probe for the refcounted modal-active store AppLayout reads to inert the
// background chrome. Rendered in its own tree so unmounting the modal
// doesn't take the reader with it.
function ActiveProbe(): JSX.Element {
  const active = useAnyModalActive()
  return <span data-testid="probe">{String(active)}</span>
}

// The real shape of every call site: a trigger that stays mounted while the
// modal comes and goes, under the <StrictMode> the app actually mounts in
// (src/main.tsx). StrictMode double-invokes effects on mount
// (setup -> cleanup -> setup), which the focus effect has to survive.
function StrictHarness({ open, children }: { open: boolean; children: ReactNode }): JSX.Element {
  return (
    <StrictMode>
      <button>Trigger</button>
      {open && (
        <Modal variant="centered" onClose={vi.fn()} label="Dialog">
          {children}
        </Modal>
      )}
    </StrictMode>
  )
}

// Stand-in for the element that had focus when the modal opened (a picker
// row, a "Delete" button). Lives outside the React trees so unmount order
// doesn't disturb it.
let opener: HTMLButtonElement

beforeEach(() => {
  // Module-level refcount persists across cases in the same worker.
  _resetModalActiveForTests()
  opener = document.createElement('button')
  opener.textContent = 'Opener'
  document.body.appendChild(opener)
})

afterEach(() => {
  opener.remove()
})

describe('Modal', () => {
  it('renders children in a modal dialog with variant classes on panel and backdrop', () => {
    const { container } = render(
      <Modal variant="centered" onClose={vi.fn()} label="Centered dialog">
        <p>Body copy</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveTextContent('Body copy')
    expect(dialog).toHaveClass('modal-panel', 'modal-panel--centered')
    expect(container.querySelector('.modal-backdrop')).toHaveClass('modal-backdrop--centered')

    cleanup()

    const drawer = render(
      <Modal variant="drawer-right" onClose={vi.fn()} label="Drawer" className="extra-class">
        <p>Body copy</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveClass(
      'modal-panel',
      'modal-panel--drawer-right',
      'extra-class',
    )
    expect(drawer.container.querySelector('.modal-backdrop')).toHaveClass(
      'modal-backdrop--drawer-right',
    )
  })

  it('names the dialog from labelledBy when it resolves, falling back to label', () => {
    // Same contract the resources drawer relies on: point at the detail
    // heading so the dialog announces the item, but keep a label for the
    // empty state where no heading renders.
    render(
      <Modal
        variant="drawer-right"
        onClose={vi.fn()}
        labelledBy="detail-title"
        label="Item details"
      >
        <h2 id="detail-title">Bloodstone</h2>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Bloodstone')

    cleanup()

    render(
      <Modal
        variant="drawer-right"
        onClose={vi.fn()}
        labelledBy="detail-title"
        label="Item details"
      >
        <p>Unknown item.</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Item details')
  })

  it('closes when the named backdrop button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <Modal variant="centered" onClose={onClose} label="Dialog" backdropLabel="Close item details">
        <p>Body</p>
      </Modal>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Close item details' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('defaults the backdrop button name to "Close dialog"', () => {
    render(
      <Modal variant="centered" onClose={vi.fn()} label="Dialog">
        <p>Body</p>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
  })

  it('closes on Escape even when focus sits on document.body', async () => {
    const onClose = vi.fn()
    render(
      <Modal variant="centered" onClose={onClose} label="Dialog">
        <p>Body</p>
      </Modal>,
    )
    // Deep-link / stray-focus state: the listener has to be on document, not
    // the panel, or the key never reaches the modal.
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.body).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('lets a capture-phase handler swallow Escape before the modal sees it', async () => {
    // StatsMultiSelect's contract: an open popover registers a capture-phase
    // document Escape handler and stops propagation, so the first Escape
    // closes the popover and leaves the modal open.
    const onClose = vi.fn()
    function swallow(e: KeyboardEvent): void {
      if (e.key === 'Escape') e.stopPropagation()
    }
    document.addEventListener('keydown', swallow, true)
    try {
      render(
        <Modal variant="centered" onClose={onClose} label="Dialog">
          <p>Body</p>
        </Modal>,
      )
      await userEvent.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('keydown', swallow, true)
    }
  })

  it('registers as an active modal while mounted so AppLayout inerts the chrome', () => {
    render(<ActiveProbe />)
    const modal = render(
      <Modal variant="centered" onClose={vi.fn()} label="Dialog">
        <p>Body</p>
      </Modal>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('true')

    modal.unmount()

    expect(screen.getByTestId('probe')).toHaveTextContent('false')
  })

  it('moves focus to the panel on mount when focus is outside it', () => {
    opener.focus()
    render(
      <Modal variant="drawer-right" onClose={vi.fn()} label="Dialog">
        <button>Inside</button>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('leaves an autoFocus child holding focus instead of stealing it', () => {
    opener.focus()
    render(
      <Modal variant="centered" onClose={vi.fn()} label="Dialog">
        <input aria-label="Confirmation" autoFocus />
      </Modal>,
    )
    expect(screen.getByLabelText('Confirmation')).toHaveFocus()
  })

  it('restores focus to the opener on unmount', () => {
    opener.focus()
    const modal = render(
      <Modal variant="centered" onClose={vi.fn()} label="Dialog">
        <button>Inside</button>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveFocus()

    modal.unmount()

    expect(opener).toHaveFocus()
  })

  it('skips focus restore when the opener left the DOM', () => {
    // The row that opened the modal can be unmounted while it's open (list
    // re-query, route change). Focusing a detached node throws nothing but
    // strands focus; the guard keeps it where the browser put it.
    opener.focus()
    const modal = render(
      <Modal variant="centered" onClose={vi.fn()} label="Dialog">
        <button>Inside</button>
      </Modal>,
    )
    opener.remove()

    expect(() => modal.unmount()).not.toThrow()
    expect(document.body).toHaveFocus()
  })

  it('restores focus to the trigger under StrictMode double-invoked effects', () => {
    // StrictMode's synthetic cleanup must not consume the restore target: if
    // it does, the real close has nothing to hand focus back to and the user
    // is stranded on <body> — in dev only, so tests that skip StrictMode
    // never see it.
    const { rerender } = render(
      <StrictHarness open={false}>
        <button>Inside</button>
      </StrictHarness>,
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    trigger.focus()

    rerender(
      <StrictHarness open>
        <button>Inside</button>
      </StrictHarness>,
    )
    expect(screen.getByRole('dialog')).toHaveFocus()

    rerender(
      <StrictHarness open={false}>
        <button>Inside</button>
      </StrictHarness>,
    )

    expect(trigger).toHaveFocus()
  })

  it('keeps focus inside the panel through a StrictMode remount with an autoFocus child', () => {
    // Pragmatic contract: StrictMode's cleanup hands focus to the trigger and
    // the re-run setup pulls it to the panel, so the autoFocus input doesn't
    // necessarily keep it in dev. What must hold is that focus never escapes
    // the panel while open, and the real close still returns it to the trigger.
    const input = <input aria-label="Confirmation" autoFocus />
    const { rerender } = render(<StrictHarness open={false}>{input}</StrictHarness>)
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    trigger.focus()

    rerender(<StrictHarness open>{input}</StrictHarness>)
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)

    rerender(<StrictHarness open={false}>{input}</StrictHarness>)

    expect(trigger).toHaveFocus()
  })

  it('ignores an Escape that cancels an IME composition', () => {
    // Cancelling a Japanese/Chinese composition in a modal input fires Escape
    // with isComposing set. That keystroke belongs to the IME, not the dialog
    // — closing the modal would discard the whole form on a mis-typed kana.
    const onClose = vi.fn()
    render(
      <Modal variant="centered" onClose={onClose} label="Dialog">
        <input aria-label="Search" />
      </Modal>,
    )

    fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'Escape', isComposing: true })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('traps Tab inside the panel, wrapping at both ends', async () => {
    render(
      <Modal variant="centered" onClose={vi.fn()} label="Dialog">
        <button>First</button>
        <button>Second</button>
      </Modal>,
    )
    const first = screen.getByRole('button', { name: 'First' })
    const second = screen.getByRole('button', { name: 'Second' })

    second.focus()
    await userEvent.tab()
    expect(first).toHaveFocus()

    await userEvent.tab({ shift: true })
    expect(second).toHaveFocus()

    // Shift+Tab from the panel itself (the mount-focus position) wraps to the
    // last control rather than escaping into the backdrop/background.
    screen.getByRole('dialog').focus()
    await userEvent.tab({ shift: true })
    expect(second).toHaveFocus()
  })

  it('parks focus on the panel when it has no focusable children', async () => {
    render(
      <Modal variant="centered" onClose={vi.fn()} label="Dialog">
        <p>Nothing to focus.</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveFocus()

    await userEvent.tab()

    expect(dialog).toHaveFocus()
  })
})
