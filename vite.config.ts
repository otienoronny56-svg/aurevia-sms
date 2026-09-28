import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/daraja': {
        target: 'https://sandbox.safaricom.co.ke',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/daraja/, ''),
      },
    },
  },
})
