import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode, type JSX, type ReactNode } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'
import { useAnyModalActive, _resetModalActiveForTests } from '../hooks/useModalActive'

function ActiveProbe(): JSX.Element {
  const active = useAnyModalActive()
  return <span data-testid="probe">{String(active)}</span>
}

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

let opener: HTMLButtonElement

beforeEach(() => {
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
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.body).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('lets a capture-phase handler swallow Escape before the modal sees it', async () => {
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
