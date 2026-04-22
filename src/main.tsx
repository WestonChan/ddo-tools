import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { LoadingGate } from './app/LoadingGate'
import { CharacterProvider } from './features/character'
import { router } from './router'
import './index.css'

// Register service worker for ddo.db caching
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(import.meta.env.BASE_URL + 'sw.js')
    .catch((err) => {
      // SW registration can fail in private-browsing contexts, non-HTTPS,
      // or sandboxed iframes — log and continue (app still works without SW).
      console.warn('Service worker registration failed:', err)
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
    <CharacterProvider>
      <LoadingGate>
        <RouterProvider router={router} />
      </LoadingGate>
    </CharacterProvider>
  </StrictMode>,
)
