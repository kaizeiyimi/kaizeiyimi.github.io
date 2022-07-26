import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import {fileURLToPath} from 'url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/blog/',
  server: {
    host: true
  },
  build: {
    outDir: '../blog'
  },
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(import.meta.url), '../src')
    }
  }
})
