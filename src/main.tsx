import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { LoadingGate } from './app/LoadingGate'
import { CharacterProvider } from './features/character'
import './index.css'

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
