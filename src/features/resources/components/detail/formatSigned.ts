// Format a bonus/effect magnitude with an explicit sign. Negative values are
// real in the data — cursed gear carries `Constitution -2`, `Will Save -2` —
// so an unconditional "+" prefix renders "+-2". Zero gets no sign at all.
// Own module (not a component-file export) so react-refresh stays happy;
// used by EnchantmentList rows and ItemDetail's enhancement attribute.
export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}
