import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ddo-builder/',
  optimizeDeps: {
    // sql.js JS module must be pre-bundled (CJS -> ESM conversion).
    // The WASM binary is loaded separately via ?url import.
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
