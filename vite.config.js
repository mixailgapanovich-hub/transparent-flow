import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Разрешаем подключаться извне (нужно для cloudflared/ngrok-туннелей).
    host: true,
    // Разрешаем чужие Host-заголовки — иначе Vite 5+ блокирует туннельные домены.
    allowedHosts: true,
    proxy: {
      // Все /api/* запросы Vite-сервера прокидываем на Express-бэк
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
