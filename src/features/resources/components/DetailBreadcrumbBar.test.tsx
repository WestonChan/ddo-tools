import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DetailBreadcrumbBar } from './DetailBreadcrumbBar'
import {
  DetailNavigationProvider,
  type DetailNavigation,
} from '../contexts/DetailNavigationContext'
import type { ResourceReference } from '../hooks/useDetailStack'

const alphaEntry: ResourceReference = { category: 'items', id: 1, name: 'Alpha' }
const betaEntry: ResourceReference = { category: 'items', id: 2, name: 'Beta' }
const gammaEntry: ResourceReference = { category: 'items', id: 3, name: 'Gamma' }

interface BreadcrumbBarRenderOptions {
  stack: ResourceReference[]
  api?: Partial<DetailNavigation>
}

function renderBreadcrumbBar(options: BreadcrumbBarRenderOptions): {
  onBackOneLevel: ReturnType<typeof vi.fn>
  onJumpToCrumb: ReturnType<typeof vi.fn>
  closeDetail: ReturnType<typeof vi.fn>
} {
  const onBackOneLevel = vi.fn()
  const onJumpToCrumb = vi.fn()
  const closeDetail = vi.fn()
  const api: DetailNavigation = {
    pushResource: vi.fn(),
    deepLinkUrl: null,
    closeDetail,
    pickerCategory: 'items',
    ...options.api,
  }
  render(
    <DetailNavigationProvider navigation={api}>
      <DetailBreadcrumbBar
        detailStack={options.stack}
        onBackOneLevel={onBackOneLevel}
        onJumpToCrumb={onJumpToCrumb}
      />
    </DetailNavigationProvider>,
  )
  return { onBackOneLevel, onJumpToCrumb, closeDetail }
}

afterEach(() => {
  cleanup()
})

describe('DetailBreadcrumbBar', () => {
  it('hides the one-step back arrow at depth 1', () => {
    renderBreadcrumbBar({ stack: [alphaEntry] })
    expect(screen.queryByRole('button', { name: /back one level/i })).toBeNull()
  })

  it('shows the one-step back arrow at depth 2+', () => {
    renderBreadcrumbBar({ stack: [alphaEntry, betaEntry] })
    expect(screen.getByRole('button', { name: /back one level/i }).parentElement).toHaveAttribute(
      'data-tip',
      'Back one level',
    )
  })

  it('back-arrow click fires onBackOneLevel', async () => {
    const user = userEvent.setup()
    const { onBackOneLevel } = renderBreadcrumbBar({ stack: [alphaEntry, betaEntry] })
    await user.click(screen.getByRole('button', { name: /back one level/i }))
    expect(onBackOneLevel).toHaveBeenCalledTimes(1)
  })

  it('always renders the leading "Back to <category>" crumb', () => {
    renderBreadcrumbBar({ stack: [alphaEntry] })
    expect(screen.getByRole('button', { name: /back to items/i })).toBeInTheDocument()
    cleanup()
    renderBreadcrumbBar({ stack: [alphaEntry, betaEntry, gammaEntry] })
    expect(screen.getByRole('button', { name: /back to items/i })).toBeInTheDocument()
  })

  it('back crumb click fires closeDetail (close all)', async () => {
    const user = userEvent.setup()
    const { closeDetail } = renderBreadcrumbBar({ stack: [alphaEntry, betaEntry] })
    await user.click(screen.getByRole('button', { name: /back to items/i }))
    expect(closeDetail).toHaveBeenCalledTimes(1)
  })

  it('back crumb label tracks the active pickerCategory', () => {
    renderBreadcrumbBar({ stack: [alphaEntry], api: { pickerCategory: 'feats' } })
    expect(screen.getByRole('button', { name: /back to feats/i })).toBeInTheDocument()
  })

  it('renders one crumb per stack entry; only the last is non-clickable text', () => {
    renderBreadcrumbBar({ stack: [alphaEntry, betaEntry, gammaEntry] })
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gamma' })).toBeNull()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('clicking a non-final crumb fires onJumpToCrumb with its index', async () => {
    const user = userEvent.setup()
    const { onJumpToCrumb } = renderBreadcrumbBar({ stack: [alphaEntry, betaEntry, gammaEntry] })
    await user.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(onJumpToCrumb).toHaveBeenCalledWith(0)
    await user.click(screen.getByRole('button', { name: 'Beta' }))
    expect(onJumpToCrumb).toHaveBeenLastCalledWith(1)
  })

  it('crumb labels fall back to category + id when entry has no name', () => {
    renderBreadcrumbBar({ stack: [{ category: 'items', id: 42 }] })
    expect(screen.getByText(/items #42/i)).toBeInTheDocument()
  })
})
