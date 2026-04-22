// Top-level path segments registered by the app router.
// Keep in sync with the createRoute calls in src/router.tsx — used by test
// stubs to register the same path set without pulling in the full route tree
// (and its feature component imports, which test mocks don't always provide).
export const APP_PATHS = [
  'build-plan',
  'characters',
  'settings',
  'overview',
  'gear',
  'damage-calc',
  'farm-checklist',
  'debug',
] as const
