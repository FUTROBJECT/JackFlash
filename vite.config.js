import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // CAP=1 → Capacitor native build (assets load from the filesystem, needs a relative base).
  // Otherwise: gh-pages base in prod, root in dev.
  base: process.env.CAP ? './' : (process.env.NODE_ENV === 'production' ? '/JackFlash/' : '/'),
  server: {
    port: 5173,
    strictPort: true,
  },
})
