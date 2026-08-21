import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css' // self-hosted fonts (bundled, offline-safe) — replaces the Google Fonts CDN
import './animations.css' // app-wide shared keyframes (fadeSlideUp, etc.)
import App from './App'
import SplashScreen from './SplashScreen.jsx'
import { hydrateFromDurable } from './storage.js'

// The app, with the opening splash overlaid for one page-load (once per launch).
// The splash is position:fixed over App, so App mounts underneath and is ready
// the moment the splash fades out.
function Root() {
  const [showSplash, setShowSplash] = useState(true)
  return (
    <>
      <App />
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    </>
  )
}

// On native, restore the data blob from durable storage (in case WKWebView purged
// localStorage) BEFORE the first render — the synchronous data layer reads it during
// render. On web this resolves immediately, so render isn't delayed.
console.log('[JF] main.jsx: module loaded, hydrating…')
hydrateFromDurable().finally(() => {
  console.log('[JF] main.jsx: hydrate settled, rendering')
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  )
  console.log('[JF] main.jsx: render called')
})
