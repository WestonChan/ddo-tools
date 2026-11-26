import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { render } from '../../../test/renderWithQueryClient'
import { API_HTTP_ERROR, ApiError } from '../../../lib/api'
import { DeclaredFilterChipRow } from './DeclaredFilterChipRow'
import { filterOptionSource, type DeclaredFilter } from './filterOptionSources'

interface Values {
  plain: string[]
  searched: string[]
  shared: string[]
  match: 'any' | 'all'
}

interface Vocabulary {
  names: string[]
  total: number
}

const fetchPlain = vi.fn<() => Promise<Vocabulary>>()
const fetchSearched = vi.fn<(search: string) => Promise<Vocabulary>>()

const plainSource = filterOptionSource<Values, Vocabulary>({
  request: { path: '/v1/plain', parameters: {} },
  restoredLabelSource: 'value',
  queryOptions: () => ({ queryKey: ['plain'], queryFn: fetchPlain, staleTime: Infinity }),
  toOptionSet: ({ shown }) => ({
    options: (shown?.names ?? []).map((name) => ({ label: name, value: name })),
  }),
})

const declarations: DeclaredFilter<Values>[] = [
  {
    key: 'plain',
    kind: 'multi',
    parameter: 'plain',
    label: 'Plain',
    optionSource: plainSource,
    matchKey: 'match',
  },
  {
    key: 'searched',
    parameter: 'searched',
    kind: 'multi',
    label: 'Searched',
    optionSource: filterOptionSource<Values, Vocabulary>({
      request: { path: '/v1/searched', parameters: { has_items: 'true' } },
      restoredLabelSource: 'value',
      isServerSearched: true,
      queryOptions: (search) => ({
        queryKey: ['searched', search],
        queryFn: () => fetchSearched(search),
        staleTime: Infinity,
      }),
      toOptionSet: ({ shown, unsearched }) => ({
        options: (shown?.names ?? []).map((name) => ({ label: name, value: name })),
        optionCount: unsearched?.total,
      }),
    }),
  },
  { key: 'shared', kind: 'multi', parameter: 'shared', label: 'Shared', optionSource: plainSource },
]

function Row(): React.JSX.Element {
  const [values, setValues] = useState<Values>({
    plain: [],
    searched: [],
    shared: [],
    match: 'any',
  })
  return (
    <DeclaredFilterChipRow
      declarations={declarations}
      values={values}
      onChange={setValues}
      onClearAll={() => setValues({ plain: [], searched: [], shared: [], match: 'any' })}
    />
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  fetchPlain.mockReset()
  fetchSearched.mockReset()
})

it('keeps option sets when a parent renders with unchanged query data and values', async () => {
  const optionSets = vi.spyOn(plainSource, 'toOptionSet')
  fetchPlain.mockResolvedValue({ names: ['Loaded option'], total: 1 })
  const { rerender } = render(<Row />)
  await userEvent.click(screen.getByRole('button', { name: 'Plain' }))
  expect(await screen.findByRole('option', { name: 'Loaded option' })).toBeInTheDocument()
  optionSets.mockClear()

  rerender(<Row />)
  rerender(<Row />)

  expect(optionSets).not.toHaveBeenCalled()
  expect(screen.getByRole('option', { name: 'Loaded option' })).toBeInTheDocument()
})

it.each(declarations)(
  'loads $label only on open, shows loading and uses its own rows',
  async (declaration) => {
    let resolveVocabulary: ((vocabulary: Vocabulary) => void) | undefined
    const vocabulary = new Promise<Vocabulary>((resolve) => {
      resolveVocabulary = resolve
    })
    fetchPlain.mockReturnValue(vocabulary)
    fetchSearched.mockReturnValue(vocabulary)
    render(<Row />)
    expect(fetchPlain).not.toHaveBeenCalled()
    expect(fetchSearched).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: declaration.label }))
    expect(screen.getByText('Loading options…')).toBeInTheDocument()
    const name = `${declaration.label} option`
    resolveVocabulary!({ names: [name], total: 1 })
    expect(await screen.findByRole('option', { name })).toBeInTheDocument()
    const fetcher = declaration.key === 'searched' ? fetchSearched : fetchPlain
    expect(fetcher).toHaveBeenCalledOnce()
    expect(declaration.key === 'searched' ? fetchPlain : fetchSearched).not.toHaveBeenCalled()
  },
)

it.each(declarations)(
  'names the whole $label request on failure and retries only that source',
  async (declaration) => {
    const failedFetcher = declaration.key === 'searched' ? fetchSearched : fetchPlain
    failedFetcher.mockRejectedValueOnce(new ApiError(API_HTTP_ERROR, 503, 'Unavailable'))
    failedFetcher.mockResolvedValue({ names: ['Recovered'], total: 1 })
    render(<Row />)
    await userEvent.click(screen.getByRole('button', { name: declaration.label }))
    expect(
      await screen.findByText(`Could not load ${declaration.label} options.`),
    ).toBeInTheDocument()
    const report = screen.getByRole('link', { name: 'Report a bug' })
    const reportParameters = new URL(report.getAttribute('href')!).searchParams
    const expectedPath =
      declaration.key === 'searched' ? '/v1/searched?has_items=true' : '/v1/plain'
    expect(reportParameters.get('title')).toContain(`on ${expectedPath}`)
    expect(reportParameters.get('body')).toContain(`**API path:** ${expectedPath}`)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('option', { name: 'Recovered' })).toBeInTheDocument()
    expect(failedFetcher).toHaveBeenCalledTimes(2)
    expect(declaration.key === 'searched' ? fetchPlain : fetchSearched).not.toHaveBeenCalled()
  },
)

it('debounces server search, keeps the unsearched total, and resets on clear and reopen', async () => {
  fetchSearched.mockImplementation(async (search) => ({
    names: search ? ['Search result'] : ['Alpha', 'Beta'],
    total: search ? 1 : 200,
  }))
  render(<Row />)
  await userEvent.click(screen.getByRole('button', { name: 'Searched' }))
  expect(await screen.findByRole('option', { name: 'Alpha' })).toBeInTheDocument()
  await userEvent.type(screen.getByRole('combobox', { name: 'Searched' }), 'alpha')
  expect(fetchSearched).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('option', { name: 'Search result' })).toBeInTheDocument()
  expect(fetchSearched).toHaveBeenLastCalledWith('alpha')
  expect(screen.getByText('1 of 200 · 0 selected')).toBeInTheDocument()
  await userEvent.clear(screen.getByRole('combobox', { name: 'Searched' }))
  expect(await screen.findByRole('option', { name: 'Beta' })).toBeInTheDocument()
  await userEvent.type(screen.getByRole('combobox', { name: 'Searched' }), 'other')
  await waitFor(() => expect(fetchSearched).toHaveBeenLastCalledWith('other'))
  await userEvent.click(screen.getByRole('button', { name: 'Searched' }))
  await userEvent.click(screen.getByRole('button', { name: 'Searched' }))
  expect(screen.getByRole('combobox', { name: 'Searched' })).toHaveValue('')
  expect(await screen.findByRole('option', { name: 'Beta' })).toBeInTheDocument()
  expect(fetchSearched).toHaveBeenCalledTimes(3)
})

it('deduplicates shared queries without warnings and carries the declared match control', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  fetchPlain.mockResolvedValue({ names: ['Shared option'], total: 1 })
  render(<Row />)
  await userEvent.click(screen.getByRole('button', { name: 'Plain' }))
  expect(await screen.findByRole('option', { name: 'Shared option' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'All' }))
  expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(screen.getByRole('button', { name: 'Shared' }))
  expect(await screen.findByRole('option', { name: 'Shared option' })).toBeInTheDocument()
  expect(fetchPlain).toHaveBeenCalledOnce()
  expect(warn).not.toHaveBeenCalled()
})
