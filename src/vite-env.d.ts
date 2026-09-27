/// <reference types="vite/client" />

// Build-time constants inlined by the `define` block in vite.config.ts.
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Origin of the `ddo-api` deployment (no trailing slash). Set per
   *  environment: `.env` locally, the Vercel dashboard for prod/preview.
   *  Unset falls back to the public API — see `src/lib/api/client.ts`. */
  readonly VITE_API_URL?: string
}
