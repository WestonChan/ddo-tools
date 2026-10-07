import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { StructuredDetailCard } from './DetailCard'

it('shows a dash for missing or blank facts while preserving zero', () => {
  render(
    <StructuredDetailCard
      variant="hover"
      kicker="Quest"
      name="Quest"
      facts={[
        { label: 'Missing', value: null },
        { label: 'Blank', value: '   ' },
        { label: 'Zero', value: 0 },
      ]}
      sections={[]}
    />,
  )
  const facts = screen
    .getAllByText(/Missing|Blank|Zero/)
    .map((label) => label.parentElement?.textContent)
  expect(facts).toEqual(['Missing—', 'Blank—', 'Zero0'])
})
