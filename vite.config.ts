import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import pkg from './package.json'

export default defineConfig(({ mode }) => {
  const sentry = loadEnv(mode, process.cwd(), 'SENTRY_')
  return {
    plugins: [
      react(),
      sentryVitePlugin({
        org: sentry.SENTRY_ORG,
        project: sentry.SENTRY_PROJECT,
        authToken: sentry.SENTRY_AUTH_TOKEN,
        disable: !sentry.SENTRY_AUTH_TOKEN,
        telemetry: false,
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      'import.meta.env.SENTRY_DSN': JSON.stringify(sentry.SENTRY_DSN ?? ''),
      'import.meta.env.SENTRY_ORG': JSON.stringify(sentry.SENTRY_ORG ?? ''),
    },
    build: {
      sourcemap: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['**/*.test.{ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**'],
    },
  }
})
