import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { ErrorBoundary } from 'react-error-boundary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorScreen } from './components'
import { CharacterProvider } from './features/character'
import { router } from './router'
import { captureBoundaryError, initializeSentry } from './lib/sentry'
import { persistNormalizedAccent, restoreAccent } from './lib/accent'
import './index.css'

initializeSentry()
restoreAccent()
persistNormalizedAccent()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 2 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={captureBoundaryError}
      fallbackRender={(props) => (
        <ErrorScreen
          {...props}
          heading="DDO Tools hit a snag"
          hint="Your character data is safe in your browser."
          issueLabels="runtime"
          actions={
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
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
