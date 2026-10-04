import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryTabs } from './CategoryTabs'

describe('CategoryTabs', () => {
  it('marks unavailable categories with the shared hint', () => {
    render(<CategoryTabs activeCategory="items" onSelect={() => {}} panelId="resource-panel" />)
    const unavailableTab = screen.getAllByRole('tab').find((tab) => tab.hasAttribute('disabled'))
    expect(unavailableTab?.parentElement).toHaveAttribute('data-tip', 'Coming soon')
  })

  it('keeps focus and selection when one enabled tab receives navigation keys', async () => {
    const onSelect = vi.fn()
    render(<CategoryTabs activeCategory="items" onSelect={onSelect} panelId="resource-panel" />)
    const items = screen.getByRole('tab', { name: 'Items' })
    expect(items).toHaveAttribute('tabindex', '0')
    expect(items).toHaveAttribute('aria-controls', 'resource-panel')
    expect(items).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0)).toEqual([items])
    act(() => items.focus())
    await userEvent.keyboard('{ArrowLeft}{ArrowRight}{Home}{End}')
    expect(items).toHaveFocus()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps a directly opened unavailable category reachable as the selected tab', async () => {
    render(<CategoryTabs activeCategory="feats" onSelect={() => {}} panelId="resource-panel" />)
    const feats = screen.getByRole('tab', { name: 'Feats' })
    expect(feats).toHaveAttribute('aria-selected', 'true')
    expect(feats).toHaveAttribute('tabindex', '0')
    expect(feats).not.toBeDisabled()
    act(() => feats.focus())
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Items' })).toHaveFocus()
  })
})
