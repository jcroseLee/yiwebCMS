import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/supabase-api': {
          target: env.VITE_SUPABASE_URL || 'https://d53bmv0g91htqli3vq50.baseapi.memfiredb.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase-api/, ''),
          ws: true,
          secure: false,
        },
      },
    },
  }
})
