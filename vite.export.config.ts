import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'src/export-runtime',
  publicDir: false, // Disable public dir copy
  resolve: {
    alias: {
      // Mock heavy/interactive components to reduce bundle size and prevent runtime errors
      '@/components/viz/containers/ChartFullView': path.resolve(__dirname, 'src/export-runtime/mocks/MockChartFullView.tsx'),
      '@/components/dashboard/dashboard-header': path.resolve(__dirname, 'src/export-runtime/mocks/MockDashboardHeader.tsx'),
      
      // Real source
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: '../../dist/export',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
  },
  define: {
    'process.env': {},
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
})
