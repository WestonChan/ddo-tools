import { useId, useRef, useState, type JSX } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AnchoredMenu, type AnchoredMenuPlacement } from './AnchoredMenu'

interface MenuWithToggleProps {
  selectedRowLabel?: string
  placement?: AnchoredMenuPlacement
  widthPx?: number
}

function MenuWithToggle({
  selectedRowLabel,
  placement = 'below',
  widthPx = 200,
}: MenuWithToggleProps): JSX.Element {
  const menuId = useId()
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  return (
    <>
      <button ref={anchorRef} type="button" onClick={() => setIsOpen((wasOpen) => !wasOpen)}>
        Toggle menu
      </button>
      <p>Outside text</p>
      <button type="button">Outside button</button>
      {isOpen && (
        <AnchoredMenu
          id={menuId}
          anchorRef={anchorRef}
          placement={placement}
          widthPx={widthPx}
          label="Example menu"
          onClose={() => setIsOpen(false)}
        >
          {['First row', 'Second row'].map((rowLabel) => (
            <button
              key={rowLabel}
              type="button"
              className="anchored-menu-row"
              aria-current={rowLabel === selectedRowLabel || undefined}
            >
              {rowLabel}
            </button>
          ))}
          <button type="button" className="anchored-menu-row" onClick={() => setIsOpen(false)}>
            Pick and close
          </button>
        </AnchoredMenu>
      )}
    </>
  )
}

function exampleMenu(): HTMLElement | null {
  return screen.queryByRole('group', { name: 'Example menu' })
}

describe('AnchoredMenu', () => {
  it('closes on a mousedown outside the menu', async () => {
    render(<MenuWithToggle />)
    expect(exampleMenu()).toBeInTheDocument()

    await userEvent.click(screen.getByText('Outside text'))

    expect(exampleMenu()).not.toBeInTheDocument()
  })

  it('closes on Escape without reaching document-level listeners, returning focus to the anchor', async () => {
    const documentKeydownListener = vi.fn()
    document.addEventListener('keydown', documentKeydownListener)
    render(<MenuWithToggle />)

    await userEvent.keyboard('{Escape}')
    document.removeEventListener('keydown', documentKeydownListener)

    expect(exampleMenu()).not.toBeInTheDocument()
    expect(documentKeydownListener).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Toggle menu' })).toHaveFocus()
  })

  it('stays open when a row inside the menu is clicked', async () => {
    render(<MenuWithToggle />)

    await userEvent.click(screen.getByRole('button', { name: 'First row' }))

    expect(exampleMenu()).toBeInTheDocument()
  })

  it('leaves the anchor to toggle the menu instead of treating it as an outside click', async () => {
    render(<MenuWithToggle />)

    await userEvent.click(screen.getByRole('button', { name: 'Toggle menu' }))
    expect(exampleMenu()).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Toggle menu' }))
    expect(exampleMenu()).toBeInTheDocument()
  })

  it('carries the id its trigger points at', () => {
    render(<MenuWithToggle />)
    expect(exampleMenu()?.id).toBeTruthy()
  })
})

describe('AnchoredMenu focus', () => {
  it('moves focus to the selected row when it opens', () => {
    render(<MenuWithToggle selectedRowLabel="Second row" />)
    expect(screen.getByRole('button', { name: 'Second row' })).toHaveFocus()
  })

  it('moves focus to the first row when no row is selected', () => {
    render(<MenuWithToggle />)
    expect(screen.getByRole('button', { name: 'First row' })).toHaveFocus()
  })

  it('returns focus to the anchor after a pick closes the menu', async () => {
    render(<MenuWithToggle />)

    await userEvent.click(screen.getByRole('button', { name: 'Pick and close' }))

    expect(exampleMenu()).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle menu' })).toHaveFocus()
  })

  it('closes when focus leaves for an element outside the menu and the anchor', () => {
    render(<MenuWithToggle />)

    act(() => screen.getByRole('button', { name: 'Toggle menu' }).focus())
    expect(exampleMenu()).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Outside button' }).focus())
    expect(exampleMenu()).not.toBeInTheDocument()
  })
})

describe('AnchoredMenu placement', () => {
  const originalInnerHeight = window.innerHeight
  const originalInnerWidth = window.innerWidth

  function setViewport(widthPx: number, heightPx: number): void {
    Object.defineProperty(window, 'innerWidth', { value: widthPx, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: heightPx, configurable: true })
  }

  function stubAnchorRect(rect: { top: number; bottom: number; left: number }): void {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      right: rect.left + 100,
      width: 100,
      height: rect.bottom - rect.top,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    })
  }

  afterEach(() => {
    vi.restoreAllMocks()
    setViewport(originalInnerWidth, originalInnerHeight)
  })

  it('opens below the anchor and fits its height to the room below, short of the viewport edge', () => {
    setViewport(1000, 800)
    stubAnchorRect({ top: 100, bottom: 130, left: 50 })
    render(<MenuWithToggle />)

    const menu = exampleMenu()!
    expect(menu.style.top).toBe('134px')
    expect(menu.style.bottom).toBe('')
    expect(menu.style.maxHeight).toBe('662px')
    expect(menu.style.left).toBe('50px')
  })

  it('flips above an anchor near the bottom of the viewport', () => {
    setViewport(1000, 800)
    stubAnchorRect({ top: 700, bottom: 730, left: 50 })
    render(<MenuWithToggle />)

    const menu = exampleMenu()!
    expect(menu.style.top).toBe('')
    expect(menu.style.bottom).toBe('104px')
    expect(menu.style.maxHeight).toBe('692px')
  })

  it('collapses to no height when the anchor is scrolled so far that neither side has room', () => {
    setViewport(1000, 800)
    stubAnchorRect({ top: -40, bottom: 840, left: 50 })

    expect(() => render(<MenuWithToggle />)).not.toThrow()

    expect(exampleMenu()!.style.maxHeight).toBe('0px')
  })

  it('keeps the menu inside the right edge of the viewport', () => {
    setViewport(400, 800)
    stubAnchorRect({ top: 100, bottom: 130, left: 200 })
    render(<MenuWithToggle widthPx={300} />)

    expect(exampleMenu()!.style.left).toBe('96px')
  })
})
