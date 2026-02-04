import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: {
      // Ignore the generated route tree to prevent infinite regeneration loop
      ignored: ['**/routeTree.gen.ts'],
    },
  },
})
