import { useEffect } from 'react'
import { ampersandMarkSvg } from '../components/ampersandMarkSvg'

const FALLBACK_ACCENT = '#b8962e'

/**
 * Regenerates the favicon SVG to use the live --accent color and swaps
 * it via a Blob URL. Watches documentElement style mutations so the
 * favicon updates whenever the user changes their accent (or theme) in
 * Settings. Uses the same helper as the in-page mark so the favicon and
 * on-page renders stay visually identical.
 */
export function useFaviconAccent(): void {
  useEffect(() => {
    let currentBlobUrl: string | null = null

    function readVar(name: string, fallback: string): string {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      return value || fallback
    }

    function update(): void {
      const svg = ampersandMarkSvg({
        fill: readVar('--accent', FALLBACK_ACCENT),
        size: 64,
      })
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        link.type = 'image/svg+xml'
        document.head.appendChild(link)
      }
      const previous = currentBlobUrl
      link.href = url
      currentBlobUrl = url
      if (previous) URL.revokeObjectURL(previous)
    }

    update()

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === 'style')) update()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })

    return () => {
      observer.disconnect()
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl)
    }
  }, [])
}
