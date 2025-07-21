import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Typetool_01/',
  plugins: [react()],
  server: { host: true },
})