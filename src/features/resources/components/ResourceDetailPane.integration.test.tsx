import { slugFromPathSegment } from '../../../lib/api'
import { apiFixture } from '../../../test/apiFixture'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import capturedTwoSetItemResponse from '../queries/fixtures/item-barbettes-bracers.json'
import capturedCaptainSetResponse from '../queries/fixtures/set-captains-set.json'
import capturedDevilSetResponse from '../queries/fixtures/set-the-devils-handiwork.json'
import { ItemHoverContent } from './detail/ResourceHoverCards'
import { render } from '../../../test/renderWithQueryClient'
import { ResourceDetailPane } from './ResourceDetailPane'
import capturedItemResponse from '../queries/fixtures/item-stolen-necklace-level-25.json'

const capturedTwoSetItem = apiFixture(capturedTwoSetItemResponse)
const capturedCaptainSet = apiFixture(capturedCaptainSetResponse)
const capturedDevilSet = apiFixture(capturedDevilSetResponse)
const capturedItem = apiFixture(capturedItemResponse)

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderItemDetail(): void {
  render(
    <ResourceDetailPane
      resourceInUrl={{ category: 'items', slug: slugFromPathSegment('test-7716')! }}
      pickerCategory="items"
    />,
  )
}

describe('ResourceDetailPane errors from the API path', () => {
  it('shows a report link for a 200 response the item mapper cannot read', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ...capturedItem, augment_slots: null })),
    )
    renderItemDetail()
    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument()
    const report = screen.getByRole('link', { name: 'Report a bug' })
    const issueUrl = new URL(report.getAttribute('href') ?? '')
    expect(report).toHaveAttribute('target', '_blank')
    expect(issueUrl.searchParams.get('labels')).toBe('bug')
    expect(issueUrl.searchParams.get('title')).toContain('/v1/items/test-7716')
    expect(issueUrl.searchParams.get('body')).toContain('/v1/items/test-7716: augment_slots')
    expect(issueUrl.searchParams.get('body')).toContain('**Site version:**')
    expect(issueUrl.searchParams.get('body')).toContain('**API base URL:**')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows connection guidance and recovers when Retry succeeds', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response(JSON.stringify(capturedItem)))
    renderItemDetail()
    expect(await screen.findByText('Could not reach the game-data service.')).toBeInTheDocument()
    expect(screen.getByText('Check your connection, then retry.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: capturedItem.name })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Report a bug' })).toBeNull()
  })
})

const twoSetCards = [
  {
    name: 'pane',
    card: (
      <ResourceDetailPane
        resourceInUrl={{ category: 'items', slug: capturedTwoSetItem.slug }}
        pickerCategory="items"
      />
    ),
  },
  { name: 'hover', card: <ItemHoverContent itemSlug={capturedTwoSetItem.slug} /> },
]

it.each(twoSetCards)(
  'keeps successful set content and reports the failed set path in the $name',
  async ({ card }) => {
    let hasSetFailure = true
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const path = new URL(String(request)).pathname
      if (path === `/v1/sets/${capturedCaptainSet.slug}` && hasSetFailure) {
        return Promise.resolve(new Response('Unavailable', { status: 500 }))
      }
      const responses: Record<string, unknown> = {
        [`/v1/items/${capturedTwoSetItem.slug}`]: capturedTwoSetItem,
        [`/v1/sets/${capturedCaptainSet.slug}`]: capturedCaptainSet,
        [`/v1/sets/${capturedDevilSet.slug}`]: capturedDevilSet,
      }
      return Promise.resolve(new Response(JSON.stringify(responses[path])))
    })
    const { container } = render(card)
    expect(await screen.findByText('The game-data service had a problem.')).toBeInTheDocument()
    expect(await screen.findByRole('row', { name: /The Devil's Handiwork/ })).toBeInTheDocument()
    const report = screen.getByRole('link', { name: 'Report a bug' })
    expect(new URL(report.getAttribute('href')!).searchParams.get('title')).toContain(
      `/v1/sets/${capturedCaptainSet.slug}`,
    )
    expect(screen.queryByRole('row', { name: /Captain's Set/ })).toBeNull()
    hasSetFailure = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('row', { name: /Captain's Set/ })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Report a bug' })).toBeNull())
    expect(
      Array.from(container.querySelectorAll('.resources-set-name'), (name) => name.textContent),
    ).toEqual(capturedTwoSetItem.sets.map((set) => set.name))
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      `/v1/items/${capturedTwoSetItem.slug}`,
      `/v1/sets/${capturedCaptainSet.slug}`,
      `/v1/sets/${capturedDevilSet.slug}`,
      `/v1/sets/${capturedCaptainSet.slug}`,
    ])
  },
)

it('reports the first failed set in item order when both set requests fail', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((request) =>
    Promise.resolve(
      new URL(String(request)).pathname === `/v1/items/${capturedTwoSetItem.slug}`
        ? new Response(JSON.stringify(capturedTwoSetItem))
        : new Response('Unavailable', { status: 500 }),
    ),
  )
  render(twoSetCards[0].card)
  const report = await screen.findByRole('link', { name: 'Report a bug' })
  expect(new URL(report.getAttribute('href')!).searchParams.get('title')).toContain(
    `/v1/sets/${capturedTwoSetItem.sets[0].slug}`,
  )
  expect(screen.getAllByText('The game-data service had a problem.')).toHaveLength(1)
})
