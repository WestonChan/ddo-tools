import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { DetailMore } from './DetailMore'
import { StructuredDetailCard } from './DetailCard'
import { detailCardSection } from './DetailCardSections'

it('reveals every remaining row and collapses them by pointer or keyboard', async () => {
  render(
    <DetailMore
      visibleCount={2}
      entries={['First', 'Second', 'Third', 'Fourth']}
      View={({ entries }) => (
        <>
          {entries.map((name) => (
            <div key={name}>{name}</div>
          ))}
        </>
      )}
    />,
  )
  expect(screen.queryByText('Third')).toBeNull()
  const toggle = screen.getByRole('button', { name: '+2 more' })
  fireEvent.click(toggle)
  expect(screen.getByText('Third')).toBeInTheDocument()
  expect(screen.getByText('Fourth')).toBeInTheDocument()
  expect(toggle).toHaveTextContent('Show less')
  toggle.focus()
  await userEvent.keyboard('{Enter}')
  expect(screen.queryByText('Third')).toBeNull()
  expect(toggle).toHaveTextContent('+2 more')
})

it('passes the same section fields to full and brief views through the row cap', () => {
  const entries = [
    { name: 'Accuracy', type: 'Competence', value: '+11' },
    { name: 'Armor Class', type: 'Natural Armor', value: '+9' },
    { name: 'Saving Throws', type: 'Resistance', value: '+9' },
  ]
  const fullView = vi.fn((props: { entries: readonly (typeof entries)[number][] }) => (
    <span>{props.entries.length}</span>
  ))
  const briefView = vi.fn((props: { entries: readonly (typeof entries)[number][] }) => (
    <span>{props.entries.length}</span>
  ))
  const section = detailCardSection({
    key: 'entries',
    heading: 'Enchantments',
    entries,
    FullView: fullView,
    BriefView: briefView,
    briefEntryLimit: 2,
  })
  const pane = render(
    <StructuredDetailCard
      variant="pane"
      kicker="Item"
      name="Item"
      facts={[]}
      sections={[section]}
    />,
  )
  expect(fullView.mock.calls[0][0].entries).toBe(entries)
  pane.unmount()
  render(
    <StructuredDetailCard
      variant="hover"
      kicker="Item"
      name="Item"
      facts={[]}
      sections={[section]}
    />,
  )
  expect(briefView.mock.calls[0][0].entries).toEqual(entries.slice(0, 2))
  fireEvent.click(screen.getByRole('button', { name: '+1 more' }))
  expect(briefView.mock.lastCall?.[0].entries).toEqual(entries)
})
