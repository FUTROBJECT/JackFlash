import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css' // self-hosted fonts (bundled, offline-safe) — replaces the Google Fonts CDN
import './animations.css' // app-wide shared keyframes (fadeSlideUp, etc.)
import App from './App'
import { hydrateFromDurable } from './storage.js'

// On native, restore the data blob from durable storage (in case WKWebView purged
// localStorage) BEFORE the first render — the synchronous data layer reads it during
// render. On web this resolves immediately, so render isn't delayed.
hydrateFromDurable().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
