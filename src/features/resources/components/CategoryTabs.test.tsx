import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryTabs } from './CategoryTabs'

describe('CategoryTabs', () => {
  it('marks unavailable categories with the shared hint', () => {
    render(<CategoryTabs activeCategory="items" onSelect={() => {}} />)
    const unavailableTab = screen.getAllByRole('tab').find((tab) => tab.hasAttribute('disabled'))
    expect(unavailableTab?.parentElement).toHaveAttribute('data-tip', 'Coming soon')
  })
})
