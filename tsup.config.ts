import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main/index.ts', 'src/preload/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  outDir: 'dist',
  external: ['electron'],
  sourcemap: true,
  shims: true, // 为 ESM 注入 __dirname 等 shim
  dts: false,
})
