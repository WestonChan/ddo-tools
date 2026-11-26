import { afterEach, expect, it, vi } from 'vitest'
import { WHOLE_LIST_PAGE_LIMIT } from '../../../lib/api'
import packs from '../../../lib/api/fixtures/adventure-packs.json'
import { fetchFilterOptionPage } from './filterOptionRequests'

afterEach(() => vi.restoreAllMocks())

it.each([
  { controls: undefined, expectedParameters: { limit: String(WHOLE_LIST_PAGE_LIMIT) } },
  {
    controls: { q: '   ', offset: 0 },
    expectedParameters: { limit: String(WHOLE_LIST_PAGE_LIMIT), offset: '0' },
  },
  {
    controls: { q: '  Ravenloft  ', offset: 2 },
    expectedParameters: { q: 'Ravenloft', limit: String(WHOLE_LIST_PAGE_LIMIT), offset: '2' },
  },
])(
  'owns paging and search when controls are $controls',
  async ({ controls, expectedParameters }) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(packs)))

    await fetchFilterOptionPage(
      {
        path: '/v1/adventure-packs',
        parameters: { q: 'fixed search', limit: 5, offset: 9 },
      },
      'adventure_packs',
      controls,
    )

    const parameters = new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams
    expect([...parameters].sort()).toEqual(Object.entries(expectedParameters).sort())
  },
)
