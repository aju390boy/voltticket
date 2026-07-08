import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // If 5173 is taken, auto-pick next free port
    proxy: {
      // Proxy all /api requests to the backend — eliminates CORS entirely
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true, // WebSocket support for Socket.IO
      },
    },
  },
})
