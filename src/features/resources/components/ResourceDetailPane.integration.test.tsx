import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ResourceDetailPane } from './ResourceDetailPane'
import capturedItem from '../queries/fixtures/item7631.json'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderItemDetail(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ResourceDetailPane resourceInUrl={{ category: 'items', id: 7631 }} pickerCategory="items" />
    </QueryClientProvider>,
  )
}

describe('ResourceDetailPane errors from the API path', () => {
  it('shows a report link for a 200 response the item mapper cannot read', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 7631, augment_slots: null })),
    )
    renderItemDetail()
    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument()
    const report = screen.getByRole('link', { name: 'Report a bug' })
    const issueUrl = new URL(report.getAttribute('href') ?? '')
    expect(report).toHaveAttribute('target', '_blank')
    expect(issueUrl.searchParams.get('labels')).toBe('bug')
    expect(issueUrl.searchParams.get('title')).toContain('/v1/items/7631')
    expect(issueUrl.searchParams.get('body')).toContain('/v1/items/7631: augment_slots')
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
