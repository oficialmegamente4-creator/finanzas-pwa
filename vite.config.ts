import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? ''
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

  if (supabaseKey && !supabaseKey.startsWith('sb_publishable_')) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY debe ser una clave sb_publishable_; nunca uses sb_secret_ ni service_role en el frontend.')
  }

  if (supabaseUrl) {
    let parsedUrl: URL
    try { parsedUrl = new URL(supabaseUrl) } catch {
      throw new Error('VITE_SUPABASE_URL no contiene una URL válida.')
    }
    const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname)
    if (parsedUrl.protocol !== 'https:' && !(parsedUrl.protocol === 'http:' && isLocalHost)) {
      throw new Error('VITE_SUPABASE_URL debe usar HTTPS; solo se permite HTTP en localhost para desarrollo local.')
    }
  }

  return {
    base: process.env.BASE_PATH ?? '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        manifest: false,
        includeAssets: ['favicon.svg', 'icon.svg', 'manifest.json', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png', 'apple-touch-icon-180x180.png'],
        workbox: {
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{html,js,css,svg,png,ico,json,woff2}'],
        },
        devOptions: { enabled: false },
      }),
    ],
  }
})
