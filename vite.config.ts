import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// VITE_SENTRY_ORG and VITE_SENTRY_PROJECT are also inlined into the
// client bundle (org slug is needed at runtime to build replay URLs;
// project slug is harmless to ship). SENTRY_AUTH_TOKEN must NOT have
// the VITE_ prefix — it's a secret and must stay out of the bundle.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryOrg = process.env.VITE_SENTRY_ORG
const sentryProject = process.env.VITE_SENTRY_PROJECT

export default defineConfig({
  plugins: [
    react(),
    // Source-map upload to Sentry. No-op when SENTRY_AUTH_TOKEN is unset
    // (local builds without Sentry credentials), so the plugin is safe to
    // include unconditionally.
    sentryVitePlugin({
      org: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,
      disable: !sentryAuthToken,
      telemetry: false,
    }),
  ],
  base: '/ddo-tools/',
  optimizeDeps: {
    // sql.js JS module must be pre-bundled (CJS -> ESM conversion).
    // The WASM binary is loaded separately via ?url import.
  },
  build: {
    // Source maps ship to GitHub Pages as .map files alongside the bundle.
    // Required for Sentry symbolication; also makes prod stack traces in
    // GitHub issue reports human-readable. The bundle is already public
    // (open-source repo), so source maps add no new exposure.
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Vitest: only `.test.{ts,tsx}` co-located in src/. `.spec.ts` is reserved
    // for Playwright E2E specs in e2e/ — see docs/testing.md.
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
