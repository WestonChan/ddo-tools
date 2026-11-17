import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { API_HTTP_ERROR, ApiError } from '../../../lib/api'
import { filterOptionSource, type DeclaredFilter } from './filterOptionSources'
import { FilteredListErrorNotice } from './FilteredListErrorNotice'

interface Values {
  tags: string[]
}
const declarations: DeclaredFilter<Values>[] = [
  {
    key: 'tags',
    kind: 'multi',
    parameter: 'tag',
    label: 'Tags',
    optionSource: filterOptionSource<Values, string[]>({
      path: '/v1/tags',
      restoredLabelSource: 'value',
      queryOptions: () => ({ queryKey: ['tags'], queryFn: async () => [] }),
      toOptionSet: () => ({ options: [] }),
    }),
  },
]

function Notice({ error }: { error: unknown }): React.JSX.Element {
  const [values, setValues] = useState<Values>({ tags: ['stale', 'kept'] })
  return (
    <>
      <FilteredListErrorNotice
        error={error}
        declarations={declarations}
        values={values}
        onChange={setValues}
      >
        <p>Ordinary notice</p>
      </FilteredListErrorNotice>
      <p aria-label="Saved tags">{values.tags.join(', ')}</p>
    </>
  )
}

afterEach(cleanup)

it('names the rejected value and offers only its removal', async () => {
  render(
    <StrictMode>
      <Notice
        error={
          new ApiError(API_HTTP_ERROR, 400, 'Bad request', {
            apiErrorText: 'unknown tag "stale"; accepted values: kept',
          })
        }
      />
    </StrictMode>,
  )
  const notice = within(screen.getByRole('status'))
  expect(notice.getByText('Tags: "stale" is no longer in the game data.')).toBeInTheDocument()
  expect(
    notice.getByText('It was renamed or removed since you saved this filter.'),
  ).toBeInTheDocument()
  expect(notice.getAllByRole('button')).toHaveLength(1)
  expect(notice.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  expect(notice.queryByRole('link')).not.toBeInTheDocument()
  expect(screen.queryByText('Ordinary notice')).not.toBeInTheDocument()
  await userEvent.click(notice.getByRole('button', { name: 'Remove from Tags' }))
  expect(screen.getByLabelText('Saved tags')).toHaveTextContent(/^kept$/)
  expect(screen.getByText('Ordinary notice')).toBeInTheDocument()
})

it.each([
  'invalid sort "bogus"',
  'unknown view "bogus"; accepted values: full, summary',
  'unknown tag "removed"',
])('renders the ordinary notice for %s', (apiErrorText) => {
  render(<Notice error={new ApiError(API_HTTP_ERROR, 400, 'Bad request', { apiErrorText })} />)
  expect(screen.getByText('Ordinary notice')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
