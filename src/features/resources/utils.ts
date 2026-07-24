import { CATEGORIES, type Category } from './types'

// Compile-time exhaustiveness check: if a future contributor adds a Category
// variant, TS will flag any switch that doesn't handle it. Used as the default
// branch in dispatching code (DetailPanel, etc.).
export function assertNever(value: never): never {
  throw new Error(`unhandled category: ${String(value)}`)
}

// Used by the router and by tests to confirm CATEGORIES never drifts out of
// sync with the type union.
export function isKnownCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}
