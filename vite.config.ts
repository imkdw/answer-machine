/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3939 },
  preview: { port: 3939 },
  // three.js 청크는 씬에서만 lazy 로드되므로 크기 경고 기준을 올린다
  build: { chunkSizeWarningLimit: 900 },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
