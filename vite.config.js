import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/new-year-2026-horse/', // ←ここを追加！前後にスラッシュが必要です
})