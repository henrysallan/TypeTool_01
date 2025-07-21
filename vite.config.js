import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/TypeTool_01/',
  plugins: [react()],
  server: { host: true },
})