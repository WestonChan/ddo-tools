import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorScreen } from './components'
import { CharacterProvider } from './features/character'
import { router } from './router'
import { captureBoundary, initSentry } from './lib/sentry'
import './index.css'

// Initialize Sentry first so any module-load-time errors (incl. SW
// registration failures and the redirect-recovery dance below) get
// captured. Skips cleanly when VITE_SENTRY_DSN is unset.
initSentry()

// Register service worker for ddo.db caching. Deferred to the `load`
// event (MDN-recommended pattern) so registration doesn't race against
// document teardown during Vite HMR reloads — that race produces a
// recurring `InvalidStateError: Failed to register a ServiceWorker:
// The document is in an invalid state.` on every hot reload, which
// we'd otherwise capture to Sentry as noise on every dev save.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js')
      .catch((err: Error) => {
        // SW registration can still fail in private-browsing contexts,
        // non-HTTPS, or sandboxed iframes — capture so we see real prod
        // failures instead of letting them disappear into the console.
        captureBoundary(err, { componentStack: 'service-worker-registration' })
        console.warn('Service worker registration failed:', err)
      })
  })
}

// GitHub Pages SPA redirect recovery.
// 404.html saves the original path to sessionStorage, then redirects here.
// Restore via replaceState BEFORE RouterProvider mounts so the router reads
// the correct URL from window.location on init.
const redirect = sessionStorage.getItem('spa-redirect')
if (redirect) {
  sessionStorage.removeItem('spa-redirect')
  window.history.replaceState(null, '', redirect)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* `<ErrorScreen>` accepts the boundary's FallbackProps shape natively
        (error: unknown narrowed internally), so {...props} mixes in the
        boundary contract alongside per-call-site config. fallbackRender
        is used here instead of FallbackComponent so we don't define a
        named component in this entry-point file (no exports by design). */}
    <ErrorBoundary
      onError={captureBoundary}
      fallbackRender={(props) => (
        <ErrorScreen
          {...props}
          heading="DDO Tools hit a snag"
          hint="Your character data is safe in your browser."
          labels="runtime"
          actions={
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          }
        />
      )}
    >
      <CharacterProvider>
        <RouterProvider router={router} />
      </CharacterProvider>
    </ErrorBoundary>
  </StrictMode>,
)
