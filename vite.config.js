import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        // Conserva el host original (ej. aromas.localhost) para que el servidor sepa qué tienda es
        changeOrigin: false
      },
      '/uploads': {
        target: 'http://localhost:3001',
        // Conserva el host original (ej. aromas.localhost) para que el servidor sepa qué tienda es
        changeOrigin: false
      }
    }
  }
})
