import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css' // self-hosted fonts (bundled, offline-safe) — replaces the Google Fonts CDN
import './animations.css' // app-wide shared keyframes (fadeSlideUp, etc.)
import App from './App'
import SplashScreen from './SplashScreen.jsx'
import { hydrateFromDurable } from './storage.js'
import { SafeArea } from '@capacitor-community/safe-area'

// WKWebView doesn't reliably expose env(safe-area-inset-*) to CSS (measured 0
// on device despite viewport-fit=cover), so this plugin injects the REAL native
// insets as --safe-area-inset-* CSS variables, live-updated on rotation. All
// safe-area styles use var(--safe-area-inset-*, env(safe-area-inset-*, 0px)) so
// web/gh-pages (where the plugin maps to env()) behaves identically.
// enable() drives Android system-bar styling; on iOS the plugin auto-injects
// the CSS variables at load and enable() reports UNIMPLEMENTED — expected.
SafeArea.enable({ config: { customColorsForSystemBars: false } }).catch(() => {})

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
