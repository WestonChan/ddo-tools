import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { LoadingGate } from './app/LoadingGate'
import { CharacterProvider } from './features/character'
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
// We restore it via replaceState so the router sees the correct URL.
const redirect = sessionStorage.getItem('spa-redirect')
if (redirect) {
  sessionStorage.removeItem('spa-redirect')
  window.history.replaceState(null, '', redirect)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CharacterProvider>
      <LoadingGate>
        <App />
      </LoadingGate>
    </CharacterProvider>
  </StrictMode>,
)
