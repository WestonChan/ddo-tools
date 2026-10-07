import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { JSX } from 'react'
import { StructuredDetailCard } from './DetailCard'
import { detailCardSection } from './DetailCardSections'

function TextRows({ entries }: { entries: readonly string[] }): JSX.Element {
  return <div>{entries.join(', ')}</div>
}

it('omits empty sections and keeps unheaded sections in the card order', () => {
  const { container } = render(
    <StructuredDetailCard
      variant="pane"
      kicker="Item"
      name="A test item"
      facts={[]}
      sections={[
        detailCardSection({ key: 'description', entries: ['First'], FullView: TextRows }),
        detailCardSection({ key: 'damage', heading: 'Damage', entries: [], FullView: TextRows }),
        detailCardSection({
          key: 'sources',
          heading: 'Sources',
          entries: ['Last'],
          FullView: TextRows,
        }),
      ]}
    />,
  )
  expect(screen.queryByRole('heading', { name: 'Damage' })).toBeNull()
  expect(
    [...container.querySelectorAll('.detail-card__section')].map((section) => section.textContent),
  ).toEqual(['First', 'SourcesLast'])
})
