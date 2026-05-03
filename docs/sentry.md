# Sentry setup

DDO Tools uses [Sentry](https://sentry.io) for automatic error capture in production. The integration is **fully optional** — the app builds and runs without any Sentry credentials configured. When unconfigured, automatic capture goes silent and the bottom-bar "Report a bug" button still opens a pre-filled GitHub issue.

## What Sentry adds when configured

- **Automatic exception capture** — every render error caught by a React error boundary, every async error from `setTimeout` / `Promise`, and the SW-registration `.catch()` get sent to your Sentry project.
- **Session Replay** — Sentry records DOM mutations + console events around an error, so you can rewind and see what the user did. All text and inputs are masked by default ([src/lib/sentry.ts](../src/lib/sentry.ts)).
- **Source-map symbolication** — uploaded by `@sentry/vite-plugin` during CI builds; production stacks resolve to the original TypeScript source.
- **GitHub-issue correlation** — clicks on the bottom-bar "Report a bug" button include the most-recent Sentry event ID + replay ID in the issue body, so you can pivot from a user report into the Sentry dashboard.

## One-time setup

### 1. Create a Sentry project

1. Sign up at [sentry.io](https://sentry.io). Free tier covers 5k events / 50 replays per month — plenty for a hobby project.
2. Create a new React project. Sentry shows you a DSN string of the form `https://<key>@<org>.ingest.sentry.io/<project-id>`.
3. Note your org slug and project slug from the URL bar (e.g., `https://<org>.sentry.io/projects/<project>/`).

### 2. Configure local development

Copy [`.env.example`](../.env.example) to `.env.local` and fill in:

```
VITE_SENTRY_DSN=https://<your-key>@<org>.ingest.sentry.io/<project-id>
```

Restart `npm run dev` after creating `.env.local`. Sentry init logs `[sentry] no DSN configured; skipping init` when the DSN is missing — once configured, that line goes away and capture starts working.

Optionally, set `VITE_SENTRY_ORG` to your org slug (the part before `.sentry.io` in your dashboard URL — e.g. `weston-00` for `https://weston-00.sentry.io/...`). When set, the bottom-bar "Report a bug" issue body includes a clickable Sentry replay URL so you can jump from a GitHub issue straight into the recorded session. Without it, only the replay ID lands in the body and you'd look it up manually.

`VITE_SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` are needed for **CI source-map upload** (used by `@sentry/vite-plugin` during production builds). They're not needed for local dev.

> **Browser-extension blocking.** Most ad/tracker blockers (uBlock Origin, Brave Shield, AdBlock, AdGuard, Privacy Badger) include `*.ingest.sentry.io` on their default blocklists, so you'll see `net::ERR_BLOCKED_BY_CLIENT` in the console when an event tries to upload. To verify locally, whitelist `localhost` in your blocker. In production, expect ~25-40% of users to be filtered this way — typical industry baseline. If the loss matters enough later, set up a Sentry tunnel (a same-origin endpoint that proxies to Sentry; needs a Cloudflare Worker / Vercel Edge function since this is GitHub Pages with no backend).

### 3. Configure GitHub Actions for production builds

Add these as GitHub repo secrets (Settings → Secrets and variables → Actions):

- `VITE_SENTRY_DSN` — same DSN as local. Inlined into the production JS bundle. DSNs are write-only ingestion keys, designed to be public, so shipping it in the bundle is safe.
- `VITE_SENTRY_ORG` — your Sentry org slug. Inlined into the bundle so the bottom-bar "Report a bug" can build clickable replay URLs.
- `VITE_SENTRY_PROJECT` — your Sentry project slug. Inlined too (used by the build-time source-map plugin).
- `SENTRY_AUTH_TOKEN` — generate at [sentry.io/settings/account/api/auth-tokens/](https://sentry.io/settings/account/api/auth-tokens/) with `project:releases` scope. **Secret** — never `VITE_`-prefixed since it must stay out of the public client bundle.

The CI workflow ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) forwards all four to the build step. When any is missing, the Vite plugin falls back to no-op for source-map upload — the deploy still succeeds, you just don't get symbolicated stacks.

## Privacy

- **No PII by default.** `Sentry.init` runs with `sendDefaultPii: false`. The `beforeSend` hook strips query strings, URL fragments, request headers, and the user object before transmission ([src/lib/sentry.ts](../src/lib/sentry.ts)).
- **Replay masks text + inputs.** `replayIntegration({ maskAllText: true, maskAllInputs: true })` means recorded sessions show only structural DOM changes — character names, build descriptions, custom inputs are redacted in the replay viewer.
- **Errors leave the user's device.** When configured, any caught error is uploaded to Sentry's servers. If that's not acceptable for your deployment, leave the DSN unset — the app falls back to the GitHub-issue flow only.

## Sample rates

Sample rates are env-aware (defined in [src/lib/sentry.ts](../src/lib/sentry.ts)):

| Setting | Dev | Prod |
|---|---|---|
| `tracesSampleRate` | 1.0 | 0.1 |
| `replaysSessionSampleRate` | 1.0 | 0.1 |
| `replaysOnErrorSampleRate` | 1.0 | 1.0 |

Full capture in dev means you can verify the integration works during build-out. Light sampling in prod protects the free-tier quota once the site has visitors. Adjust `import.meta.env.DEV ? 1.0 : 0.1` in `initSentry()` if your usage profile shifts.
