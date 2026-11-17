import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // In development the browser talks to Vite, which forwards /api to the Spring Boot backend.
      // Same origin => no CORS problems, whichever port or host name Vite ends up on.
      proxy: {
        '/api': {
          target: env.DEV_API_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
          // Drop the browser's Origin header so Spring treats these as plain same-origin calls
          // and never applies its CORS check (which answers 403 "Invalid CORS request").
          configure: (proxy) => proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin')),
        },
      },
    },
  }
})
