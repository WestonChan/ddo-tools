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

initSentry()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 2 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
