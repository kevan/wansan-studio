import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import obfuscator from 'rollup-plugin-obfuscator'

const _dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(resolve(_dirname, 'package.json'), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'production' ? obfuscator({
      global: true,
      options: {
        compact: true,
        controlFlowFlattening: false, // 前端性能敏感，关闭控制流扁平化
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        renameGlobals: false,
        rotateStringArray: true,
        selfDefending: false,
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 0.75,
        splitStrings: true,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      }
    }) : null
  ],
  root: './src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(_dirname, 'src/renderer/index.html')
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': resolve(_dirname, 'src/renderer'),
      '@shared': resolve(_dirname, 'src/shared'),
      '@types': resolve(_dirname, 'src/types')
    }
  },
  define: {
    __IS_DEV__: JSON.stringify(mode === 'development'),
    __APP_VERSION__: JSON.stringify(pkg.version)
  }
}))
