import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DetailBar } from './DetailBar'
import { DetailNavProvider, type DetailNavApi } from '../contexts/DetailNavContext'
import type { StackEntry } from '../hooks/useDetailStack'

const a: StackEntry = { category: 'items', id: 1, name: 'Alpha' }
const b: StackEntry = { category: 'items', id: 2, name: 'Beta' }
const c: StackEntry = { category: 'items', id: 3, name: 'Gamma' }

interface RenderOpts {
  stack: StackEntry[]
  api?: Partial<DetailNavApi>
}

function renderBar(opts: RenderOpts): {
  onBack: ReturnType<typeof vi.fn>
  onJumpToCrumb: ReturnType<typeof vi.fn>
  closeDrawer: ReturnType<typeof vi.fn>
} {
  const onBack = vi.fn()
  const onJumpToCrumb = vi.fn()
  const closeDrawer = vi.fn()
  const api: DetailNavApi = {
    pushDetail: vi.fn(),
    deepLinkUrl: null,
    closeDrawer,
    baseCategory: 'items',
    ...opts.api,
  }
  render(
    <DetailNavProvider api={api}>
      <DetailBar stack={opts.stack} onBack={onBack} onJumpToCrumb={onJumpToCrumb} />
    </DetailNavProvider>,
  )
  return { onBack, onJumpToCrumb, closeDrawer }
}

afterEach(() => {
  cleanup()
})

describe('DetailBar', () => {
  it('hides the one-step back arrow at depth 1', () => {
    renderBar({ stack: [a] })
    expect(screen.queryByRole('button', { name: /back one level/i })).toBeNull()
  })

  it('shows the one-step back arrow at depth 2+', () => {
    renderBar({ stack: [a, b] })
    expect(screen.getByRole('button', { name: /back one level/i })).toBeInTheDocument()
  })

  it('back-arrow click fires onBack', async () => {
    const user = userEvent.setup()
    const { onBack } = renderBar({ stack: [a, b] })
    await user.click(screen.getByRole('button', { name: /back one level/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('always renders the leading "Back to <category>" crumb', () => {
    renderBar({ stack: [a] })
    expect(screen.getByRole('button', { name: /back to items/i })).toBeInTheDocument()
    cleanup()
    renderBar({ stack: [a, b, c] })
    expect(screen.getByRole('button', { name: /back to items/i })).toBeInTheDocument()
  })

  it('back crumb click fires closeDrawer (close all)', async () => {
    const user = userEvent.setup()
    const { closeDrawer } = renderBar({ stack: [a, b] })
    await user.click(screen.getByRole('button', { name: /back to items/i }))
    expect(closeDrawer).toHaveBeenCalledTimes(1)
  })

  it('back crumb label tracks the active baseCategory', () => {
    renderBar({ stack: [a], api: { baseCategory: 'feats' } })
    expect(screen.getByRole('button', { name: /back to feats/i })).toBeInTheDocument()
  })

  it('renders one crumb per stack entry; only the last is non-clickable text', () => {
    renderBar({ stack: [a, b, c] })
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gamma' })).toBeNull()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('clicking a non-final crumb fires onJumpToCrumb with its index', async () => {
    const user = userEvent.setup()
    const { onJumpToCrumb } = renderBar({ stack: [a, b, c] })
    await user.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(onJumpToCrumb).toHaveBeenCalledWith(0)
    await user.click(screen.getByRole('button', { name: 'Beta' }))
    expect(onJumpToCrumb).toHaveBeenLastCalledWith(1)
  })

  it('crumb labels fall back to category + id when entry has no name', () => {
    renderBar({ stack: [{ category: 'items', id: 42 }] })
    expect(screen.getByText(/items #42/i)).toBeInTheDocument()
  })
})
