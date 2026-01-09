import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
    outDir: 'dist/export', // Adjusted relative to root
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
  },
  define: {
    'process.env': {},
  },
})