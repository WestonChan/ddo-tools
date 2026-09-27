import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { ErrorBoundary } from 'react-error-boundary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorScreen } from './components'
import { CharacterProvider } from './features/character'
import { router } from './router'
import { captureBoundary, initSentry } from './lib/sentry'
import './index.css'

// Initialize Sentry first so any module-load-time errors (incl. SW
// registration failures and the redirect-recovery dance below) get
// captured. Skips cleanly when VITE_SENTRY_DSN is unset.
initSentry()

// Game data is immutable per API deployment and every response is cacheable,
// so queries never go stale on their own. Retries cover an API machine that
// is resuming from suspend; a 404 is final and is opted out per query.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 2 },
  },
})

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
      <QueryClientProvider client={queryClient}>
        <CharacterProvider>
          <RouterProvider router={router} />
        </CharacterProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
