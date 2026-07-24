import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDetailStack, type StackEntry } from './useDetailStack'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

beforeEach(() => {
  navigateMock.mockClear()
})

const itemA: StackEntry = { category: 'items', id: 1, name: 'A' }
const itemB: StackEntry = { category: 'items', id: 2, name: 'B' }
const itemC: StackEntry = { category: 'items', id: 3, name: 'C' }

describe('useDetailStack — initial state', () => {
  it('starts empty when urlEntry is null', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: null, baseCategory: 'items' }),
    )
    expect(result.current.stack).toEqual([])
    expect(result.current.isOpen).toBe(false)
  })

  it('seeds the stack from urlEntry on initial mount (deep-link entry)', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: itemA, baseCategory: 'items' }),
    )
    expect(result.current.stack).toEqual([itemA])
    expect(result.current.isOpen).toBe(true)
  })
})

describe('useDetailStack — pushDetail', () => {
  it('depth-1 push navigates and waits for URL sync', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: null, baseCategory: 'items' }),
    )
    act(() => {
      result.current.pushDetail(itemA)
    })
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/1' })
    // Stack stays empty until the URL-sync effect runs on next render with
    // the updated urlEntry — caller's responsibility.
    expect(result.current.stack).toEqual([])
  })

  it('depth-2+ push is in-memory only, URL unchanged', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: itemA, baseCategory: 'items' }),
    )
    act(() => {
      result.current.pushDetail(itemB)
    })
    expect(navigateMock).not.toHaveBeenCalled()
    expect(result.current.stack).toEqual([itemA, itemB])
  })

  it('depth-3 push appends without navigation', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: itemA, baseCategory: 'items' }),
    )
    act(() => {
      result.current.pushDetail(itemB)
    })
    act(() => {
      result.current.pushDetail(itemC)
    })
    expect(navigateMock).not.toHaveBeenCalled()
    expect(result.current.stack).toEqual([itemA, itemB, itemC])
  })
})

describe('useDetailStack — popDetail', () => {
  it('depth-1 pop closes the drawer (replace nav)', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: itemA, baseCategory: 'items' }),
    )
    act(() => {
      result.current.popDetail()
    })
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/resources/items',
      replace: true,
    })
    expect(result.current.stack).toEqual([])
  })

  it('depth-2 pop returns to depth-1, URL unchanged', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: itemA, baseCategory: 'items' }),
    )
    act(() => {
      result.current.pushDetail(itemB)
    })
    act(() => {
      result.current.popDetail()
    })
    expect(navigateMock).not.toHaveBeenCalled()
    expect(result.current.stack).toEqual([itemA])
  })
})

describe('useDetailStack — jumpToCrumb', () => {
  it('truncates the stack to the chosen index', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: itemA, baseCategory: 'items' }),
    )
    act(() => {
      result.current.pushDetail(itemB)
    })
    act(() => {
      result.current.pushDetail(itemC)
    })
    expect(result.current.stack).toEqual([itemA, itemB, itemC])
    act(() => {
      result.current.jumpToCrumb(0)
    })
    expect(result.current.stack).toEqual([itemA])
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('jumpToCrumb(-1) closes the drawer', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: itemA, baseCategory: 'items' }),
    )
    act(() => {
      result.current.jumpToCrumb(-1)
    })
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/resources/items',
      replace: true,
    })
    expect(result.current.stack).toEqual([])
  })
})

describe('useDetailStack — closeDrawer', () => {
  it('clears stack and navigates with replace to the picker', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: itemA, baseCategory: 'items' }),
    )
    act(() => {
      result.current.pushDetail(itemB)
    })
    act(() => {
      result.current.closeDrawer()
    })
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/resources/items',
      replace: true,
    })
    expect(result.current.stack).toEqual([])
  })
})

describe('useDetailStack — URL → stack sync', () => {
  it('clears the stack when urlEntry becomes null (browser back)', () => {
    const { result, rerender } = renderHook(
      ({ urlEntry }: { urlEntry: StackEntry | null }) =>
        useDetailStack({ urlEntry, baseCategory: 'items' }),
      { initialProps: { urlEntry: itemA } },
    )
    expect(result.current.stack).toEqual([itemA])
    rerender({ urlEntry: null })
    expect(result.current.stack).toEqual([])
  })

  it('seeds the stack when urlEntry changes from null to an entry', () => {
    const { result, rerender } = renderHook(
      ({ urlEntry }: { urlEntry: StackEntry | null }) =>
        useDetailStack({ urlEntry, baseCategory: 'items' }),
      { initialProps: { urlEntry: null as StackEntry | null } },
    )
    rerender({ urlEntry: itemA })
    expect(result.current.stack).toEqual([itemA])
  })

  it('resets the stack to a single entry when the URL changes externally', () => {
    const { result, rerender } = renderHook(
      ({ urlEntry }: { urlEntry: StackEntry | null }) =>
        useDetailStack({ urlEntry, baseCategory: 'items' }),
      { initialProps: { urlEntry: itemA } },
    )
    // Build up an in-memory deeper stack
    act(() => {
      result.current.pushDetail(itemB)
    })
    expect(result.current.stack).toEqual([itemA, itemB])
    // External URL nav (e.g., bookmark/forward) — stack resets to itemC
    rerender({ urlEntry: itemC })
    expect(result.current.stack).toEqual([itemC])
  })

  it('keeps the in-memory deeper stack when urlEntry equals the current depth-1', () => {
    const { result, rerender } = renderHook(
      ({ urlEntry }: { urlEntry: StackEntry | null }) =>
        useDetailStack({ urlEntry, baseCategory: 'items' }),
      { initialProps: { urlEntry: itemA } },
    )
    act(() => {
      result.current.pushDetail(itemB)
    })
    // Re-render with the same urlEntry (no URL change) — stack should NOT reset.
    rerender({ urlEntry: itemA })
    expect(result.current.stack).toEqual([itemA, itemB])
  })
})

describe('useDetailStack — deepLinkUrl', () => {
  it('is null when stack is empty', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: null, baseCategory: 'items' }),
    )
    expect(result.current.deepLinkUrl).toBeNull()
  })

  it('points at the current TOP, not the depth-1 entry', () => {
    const { result } = renderHook(() =>
      useDetailStack({ urlEntry: itemA, baseCategory: 'items' }),
    )
    act(() => {
      result.current.pushDetail(itemB)
    })
    expect(result.current.deepLinkUrl).toContain('/resources/items/2')
    expect(result.current.deepLinkUrl).not.toContain('/resources/items/1')
  })
})
