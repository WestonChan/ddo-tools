import { describe, it, expect } from 'vitest'
import { ampersandMarkSvg } from './ampersandMarkSvg'

describe('ampersandMarkSvg', () => {
  it('emits a single <text> element wrapped in <svg> by default', () => {
    const svg = ampersandMarkSvg()
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('<text')
    expect(svg).not.toContain('<rect')
  })

  it('uses currentColor as the fill by default', () => {
    expect(ampersandMarkSvg()).toContain('fill="currentColor"')
  })

  it('renders the ampersand entity', () => {
    expect(ampersandMarkSvg()).toContain('&amp;')
  })

  it('uses Vollkorn as the primary font with serif fallbacks', () => {
    expect(ampersandMarkSvg()).toMatch(
      /font-family="'Vollkorn','Georgia','Times New Roman',serif"/,
    )
  })

  it('centers the glyph at the box center using dy="0.35em"', () => {
    const svg = ampersandMarkSvg()
    expect(svg).toContain('x="32"')
    expect(svg).toContain('y="32"')
    expect(svg).toContain('text-anchor="middle"')
    expect(svg).toContain('dy="0.35em"')
  })

  it('uses a 64x64 viewBox regardless of size', () => {
    expect(ampersandMarkSvg({ size: 16 })).toContain('viewBox="0 0 64 64"')
    expect(ampersandMarkSvg({ size: '100%' })).toContain('viewBox="0 0 64 64"')
  })

  it('passes through the size to width/height', () => {
    const at32 = ampersandMarkSvg({ size: 32 })
    expect(at32).toContain('width="32"')
    expect(at32).toContain('height="32"')
  })

  it('accepts a string size like 100% for fluid containers', () => {
    const fluid = ampersandMarkSvg({ size: '100%' })
    expect(fluid).toContain('width="100%"')
    expect(fluid).toContain('height="100%"')
  })

  it('uses the provided fill color (e.g. resolved accent for favicons)', () => {
    const svg = ampersandMarkSvg({ fill: '#b8962e' })
    expect(svg).toContain('fill="#b8962e"')
    expect(svg).not.toContain('fill="currentColor"')
  })
})
