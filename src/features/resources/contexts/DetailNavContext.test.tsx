import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DetailNavProvider, useDetailNav, type DetailNavApi } from './DetailNavContext'

function Reader({
  onRead,
}: {
  onRead: (api: DetailNavApi) => void
}): null {
  const api = useDetailNav()
  onRead(api)
  return null
}

describe('DetailNavContext', () => {
  it('returns a no-op API when no provider is mounted', () => {
    let captured: DetailNavApi | null = null
    render(
      <Reader
        onRead={(api) => {
          captured = api
        }}
      />,
    )
    expect(captured).not.toBeNull()
    expect(captured!.deepLinkUrl).toBeNull()
    expect(captured!.baseCategory).toBe('items')
    // Default methods should not throw
    expect(() => captured!.pushDetail({ category: 'items', id: 42 })).not.toThrow()
    expect(() => captured!.closeDrawer()).not.toThrow()
  })

  it('forwards the provided API through the provider', () => {
    const pushDetail = vi.fn()
    const closeDrawer = vi.fn()
    let captured: DetailNavApi | null = null
    render(
      <DetailNavProvider
        api={{
          pushDetail,
          closeDrawer,
          deepLinkUrl: 'https://example.test/x',
          baseCategory: 'items',
        }}
      >
        <Reader
          onRead={(api) => {
            captured = api
          }}
        />
      </DetailNavProvider>,
    )
    captured!.pushDetail({ category: 'items', id: 7 })
    expect(pushDetail).toHaveBeenCalledWith({ category: 'items', id: 7 })
    captured!.closeDrawer()
    expect(closeDrawer).toHaveBeenCalled()
    expect(captured!.deepLinkUrl).toBe('https://example.test/x')
  })
})
