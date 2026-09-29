import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDetailDrawerStack, type ResourceReference } from './useDetailDrawerStack'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

beforeEach(() => {
  navigateMock.mockClear()
})

const itemA: ResourceReference = { category: 'items', id: 1, name: 'A' }
const itemB: ResourceReference = { category: 'items', id: 2, name: 'B' }
const itemC: ResourceReference = { category: 'items', id: 3, name: 'C' }

describe('useDetailDrawerStack — initial state', () => {
  it('starts empty when resourceInUrl is null', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: null, pickerCategory: 'items' }),
    )
    expect(result.current.stack).toEqual([])
    expect(result.current.isDrawerOpen).toBe(false)
  })

  it('seeds the stack from resourceInUrl on initial mount (deep-link entry)', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    expect(result.current.stack).toEqual([itemA])
    expect(result.current.isDrawerOpen).toBe(true)
  })
})

describe('useDetailDrawerStack — pushResource', () => {
  it('depth-1 push navigates and waits for URL sync', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: null, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.pushResource(itemA)
    })
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/1' })
    expect(result.current.stack).toEqual([])
  })

  it('depth-2+ push is in-memory only, URL unchanged', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.pushResource(itemB)
    })
    expect(navigateMock).not.toHaveBeenCalled()
    expect(result.current.stack).toEqual([itemA, itemB])
  })

  it('depth-3 push appends without navigation', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.pushResource(itemB)
    })
    act(() => {
      result.current.pushResource(itemC)
    })
    expect(navigateMock).not.toHaveBeenCalled()
    expect(result.current.stack).toEqual([itemA, itemB, itemC])
  })

  it('ignores a push of the entry already on top', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.pushResource(itemB)
    })
    act(() => {
      result.current.pushResource(itemB)
    })
    expect(result.current.stack).toEqual([itemA, itemB])
  })

  it('still allows revisiting an entry deeper in the stack', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.pushResource(itemB)
    })
    act(() => {
      result.current.pushResource(itemA)
    })
    expect(result.current.stack).toEqual([itemA, itemB, itemA])
  })
})

describe('useDetailDrawerStack — popResource', () => {
  it('depth-1 pop closes the drawer (replace nav)', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.popResource()
    })
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/resources/items',
      replace: true,
    })
    expect(result.current.stack).toEqual([])
  })

  it('depth-2 pop returns to depth-1, URL unchanged', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.pushResource(itemB)
    })
    act(() => {
      result.current.popResource()
    })
    expect(navigateMock).not.toHaveBeenCalled()
    expect(result.current.stack).toEqual([itemA])
  })
})

describe('useDetailDrawerStack — jumpToBreadcrumb', () => {
  it('truncates the stack to the chosen index', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.pushResource(itemB)
    })
    act(() => {
      result.current.pushResource(itemC)
    })
    expect(result.current.stack).toEqual([itemA, itemB, itemC])
    act(() => {
      result.current.jumpToBreadcrumb(0)
    })
    expect(result.current.stack).toEqual([itemA])
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('jumpToBreadcrumb(-1) closes the drawer', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.jumpToBreadcrumb(-1)
    })
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/resources/items',
      replace: true,
    })
    expect(result.current.stack).toEqual([])
  })
})

describe('useDetailDrawerStack — closeDrawer', () => {
  it('clears stack and navigates with replace to the picker', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.pushResource(itemB)
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

describe('useDetailDrawerStack — URL → stack sync', () => {
  it('clears the stack when resourceInUrl becomes null (browser back)', () => {
    const { result, rerender } = renderHook(
      ({ resourceInUrl }: { resourceInUrl: ResourceReference | null }) =>
        useDetailDrawerStack({ resourceInUrl, pickerCategory: 'items' }),
      { initialProps: { resourceInUrl: itemA } },
    )
    expect(result.current.stack).toEqual([itemA])
    rerender({ resourceInUrl: null })
    expect(result.current.stack).toEqual([])
  })

  it('seeds the stack when resourceInUrl changes from null to an entry', () => {
    const { result, rerender } = renderHook(
      ({ resourceInUrl }: { resourceInUrl: ResourceReference | null }) =>
        useDetailDrawerStack({ resourceInUrl, pickerCategory: 'items' }),
      { initialProps: { resourceInUrl: null as ResourceReference | null } },
    )
    rerender({ resourceInUrl: itemA })
    expect(result.current.stack).toEqual([itemA])
  })

  it('resets the stack to a single entry when the URL changes externally', () => {
    const { result, rerender } = renderHook(
      ({ resourceInUrl }: { resourceInUrl: ResourceReference | null }) =>
        useDetailDrawerStack({ resourceInUrl, pickerCategory: 'items' }),
      { initialProps: { resourceInUrl: itemA } },
    )
    act(() => {
      result.current.pushResource(itemB)
    })
    expect(result.current.stack).toEqual([itemA, itemB])
    rerender({ resourceInUrl: itemC })
    expect(result.current.stack).toEqual([itemC])
  })

  it('keeps the in-memory deeper stack when resourceInUrl equals the current depth-1', () => {
    const { result, rerender } = renderHook(
      ({ resourceInUrl }: { resourceInUrl: ResourceReference | null }) =>
        useDetailDrawerStack({ resourceInUrl, pickerCategory: 'items' }),
      { initialProps: { resourceInUrl: itemA } },
    )
    act(() => {
      result.current.pushResource(itemB)
    })
    rerender({ resourceInUrl: itemA })
    expect(result.current.stack).toEqual([itemA, itemB])
  })
})

describe('useDetailDrawerStack — deepLinkUrl', () => {
  it('is null when stack is empty', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: null, pickerCategory: 'items' }),
    )
    expect(result.current.deepLinkUrl).toBeNull()
  })

  it('points at the current TOP, not the depth-1 entry', () => {
    const { result } = renderHook(() =>
      useDetailDrawerStack({ resourceInUrl: itemA, pickerCategory: 'items' }),
    )
    act(() => {
      result.current.pushResource(itemB)
    })
    expect(result.current.deepLinkUrl).toContain('/resources/items/2')
    expect(result.current.deepLinkUrl).not.toContain('/resources/items/1')
  })
})
