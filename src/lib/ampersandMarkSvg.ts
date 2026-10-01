export interface AmpersandMarkSvgOptions {
  fillColor?: string
  size?: number | string
}

export function ampersandMarkSvg({
  fillColor = 'currentColor',
  size = 64,
}: AmpersandMarkSvgOptions = {}): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">` +
    `<text x="32" y="32" text-anchor="middle" dy="0.35em" ` +
    `font-family="IM Fell DW Pica SC, Georgia, serif" ` +
    `font-size="52" font-weight="400" fill="${fillColor}">&amp;</text>` +
    '</svg>'
  )
}
