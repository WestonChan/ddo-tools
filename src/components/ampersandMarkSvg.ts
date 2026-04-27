export interface AmpersandMarkSvgOptions {
  /** Glyph color. */
  fill?: string
  /** width/height attribute on the <svg> root. */
  size?: number | string
}

/**
 * Single source of truth for the brand ampersand mark — used by the favicon,
 * the landing hero, and the nav bar brand. One bare-glyph shape rendered
 * everywhere — no framing variants.
 */
export function ampersandMarkSvg({
  fill = 'currentColor',
  size = 64,
}: AmpersandMarkSvgOptions = {}): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">` +
    `<text x="32" y="32" text-anchor="middle" dy="0.35em" ` +
    `font-family="'Vollkorn','Georgia','Times New Roman',serif" ` +
    `font-size="52" font-weight="700" fill="${fill}">&amp;</text>` +
    '</svg>'
  )
}
