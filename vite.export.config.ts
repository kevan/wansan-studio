import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const _dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(resolve(_dirname, 'package.json'), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    viteSingleFile()
  ],
  root: 'src/export-runtime',
  publicDir: false, // Disable public dir copy
  resolve: {
    alias: {
      // Mock heavy/interactive components to reduce bundle size and prevent runtime errors
      '@/components/viz/containers/ChartFullView': resolve(_dirname, 'src/export-runtime/mocks/MockNullComponent.tsx'),
      '@/components/dashboard/dashboard-header': resolve(_dirname, 'src/export-runtime/mocks/MockNullComponent.tsx'),
      '@/components/ui/markdown-editor': resolve(_dirname, 'src/export-runtime/mocks/MockNullComponent.tsx'),
      
      // Mock Stores (Critical for hydration)
      '@/stores/useWorkbenchStore': resolve(_dirname, 'src/export-runtime/mocks/stores.ts'),
      '@/stores/useProjectStore': resolve(_dirname, 'src/export-runtime/mocks/stores.ts'),
      '@/stores/useUIStore': resolve(_dirname, 'src/export-runtime/mocks/stores.ts'),
      '@/stores/useChatStore': resolve(_dirname, 'src/export-runtime/mocks/stores.ts'),
      '@/stores/useSettingsStore': resolve(_dirname, 'src/export-runtime/mocks/stores.ts'),
      '@/stores/useSqlLabStore': resolve(_dirname, 'src/export-runtime/mocks/stores.ts'),
      '@/stores/useToastStore': resolve(_dirname, 'src/export-runtime/mocks/stores.ts'),

      // Real source
      '@': resolve(_dirname, 'src/renderer'),
      '@shared': resolve(_dirname, 'src/shared'),
    },
  },
  build: {
    outDir: '../../dist/export',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
        input: resolve(_dirname, 'src/export-runtime/index.html'),
        external: ['echarts'], // Only externalize ECharts
        output: {
            format: 'iife', 
            globals: {
                'echarts': 'echarts',
            }
        }
    }
  },
  define: {
    'process.env': {},
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
})
