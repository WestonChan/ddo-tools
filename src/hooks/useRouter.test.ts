import { renderHook, act } from '@testing-library/react'
import { useRouter } from './useRouter'
import type { View } from './useRouter'

// In vitest, import.meta.env.BASE_URL is '/' (not '/ddo-tools/')
// so BASE in useRouter resolves to '' (empty string after trailing slash strip).
// Paths in tests use just '/{view}'.

function setPath(path: string): void {
  window.history.replaceState(null, '', path)
}

beforeEach(() => {
  setPath('/build-plan')
})

describe('useRouter', () => {
  describe('getViewFromPath', () => {
    it('returns build-plan for the root path', () => {
      setPath('/')
      const { result } = renderHook(() => useRouter())
      expect(result.current.view).toBe('build-plan')
    })

    it.each([
      'characters',
      'overview',
      'build-plan',
      'gear',
      'damage-calc',
      'farm-checklist',
      'debug',
      'settings',
    ] as View[])('parses "%s" from pathname', (view) => {
      setPath(`/${view}`)
      const { result } = renderHook(() => useRouter())
      expect(result.current.view).toBe(view)
    })

    it('returns not-found for unknown paths', () => {
      setPath('/nonexistent')
      const { result } = renderHook(() => useRouter())
      expect(result.current.view).toBe('not-found')
    })

    it('strips sub-paths (e.g. debug/items -> debug)', () => {
      setPath('/debug/items')
      const { result } = renderHook(() => useRouter())
      expect(result.current.view).toBe('debug')
    })
  })

  describe('navigate', () => {
    it('updates view and pushes history state', () => {
      const { result } = renderHook(() => useRouter())
      const pushSpy = vi.spyOn(window.history, 'pushState')

      act(() => {
        result.current.navigate('gear')
      })

      expect(result.current.view).toBe('gear')
      expect(pushSpy).toHaveBeenCalledWith(null, '', '/gear')
      pushSpy.mockRestore()
    })
  })

  describe('popstate', () => {
    it('updates view when browser navigates back', () => {
      const { result } = renderHook(() => useRouter())

      act(() => {
        result.current.navigate('settings')
      })
      expect(result.current.view).toBe('settings')

      act(() => {
        setPath('/build-plan')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      expect(result.current.view).toBe('build-plan')
    })
  })
})
