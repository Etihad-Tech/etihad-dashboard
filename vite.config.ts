import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/** The proxy is DEV-ONLY — Vite does not apply it to a production build, where the app
 *  talks to VITE_AI_API_URL directly as it always has.
 *
 *  It exists so the panel can be opened from a PHONE on the same wi-fi (`npm run dev --
 *  --host`, then http://<this-machine>:5173). Without it the phone's browser calls the
 *  api from a LAN origin, and the api's CORS list only names localhost — so every read
 *  fails and the panel looks broken rather than blocked. Behind the proxy the browser
 *  only ever talks to the origin it loaded from, so there is no cross-origin request to
 *  allow. Set VITE_AI_API_URL=/ai-api in .env.local to use it.
 *
 *  /team-api is proxied too because the login posts to BOTH apis (see stores/auth.ts).
 *  It is usually not running locally; that call failing is already the normal path. */
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/ai-api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ai-api/, ''),
      },
      '/team-api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/team-api/, ''),
      },
    },
  },
})
