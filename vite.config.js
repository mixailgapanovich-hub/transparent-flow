import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // SPA-фоллбек: /guest/:token и любые другие неизвестные пути → index.html
    historyApiFallback: true,
    proxy: {
      // Все /api/* запросы Vite-сервера прокидываем на Express-бэк
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
