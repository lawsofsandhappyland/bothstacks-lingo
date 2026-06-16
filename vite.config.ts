/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Only our own app tests. Keeps vitest out of the Python ADK agent project
    // (bothlingo-tutor/.venv ships its own .test.ts template files).
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
