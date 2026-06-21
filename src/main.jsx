import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css' // self-hosted fonts (bundled, offline-safe) — replaces the Google Fonts CDN
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
