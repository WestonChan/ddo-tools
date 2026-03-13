import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { CharacterProvider } from './features/character'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CharacterProvider>
      <App />
    </CharacterProvider>
  </StrictMode>,
)
