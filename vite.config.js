import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.DEPLOYMENT_BASE_URL || '/'

export default defineConfig({
  plugins: [react()],
  base,
})
