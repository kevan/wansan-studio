import { defineConfig } from 'tsup'
import JavaScriptObfuscator from 'javascript-obfuscator'
import fs from 'fs'
import path from 'path'

// 简单的递归遍历文件函数
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file))
    }
  })

  return arrayOfFiles
}

export default defineConfig({
  entry: [
    'src/main/index.ts',
    'src/preload/index.ts',
    'src/main/workers/excelWorker.ts',
    'src/main/services/db-service/entry.ts',
    'src/main/services/db-service/client.ts',
  ],
  format: ['esm', 'cjs'],
  target: 'node20',
  clean: false, // Don't clean dist, handled by build script or we append to it
  outDir: 'dist',
  external: ['electron', 'dotenv', '@duckdb/node-api'],
  sourcemap: true,
  shims: true, // 为 ESM 注入 __dirname 等 shim
  dts: false,
  define: {
    'process.env.VITE_SPECIAL_CHANNEL': JSON.stringify(
      process.env.VITE_SPECIAL_CHANNEL || ''
    ),
    'process.env.VITE_DEFAULT_EXPIRY': JSON.stringify(
      process.env.VITE_DEFAULT_EXPIRY || ''
    ),
    'process.env.VITE_BUILTIN_BASE_URL': JSON.stringify(
      process.env.VITE_BUILTIN_BASE_URL || ''
    ),
    'process.env.VITE_BUILTIN_MODELS': JSON.stringify(
      process.env.VITE_BUILTIN_MODELS || ''
    ),
    'process.env.VITE_BUILTIN_API_KEY': JSON.stringify(
      process.env.VITE_BUILTIN_API_KEY || ''
    ),
  },
  onSuccess: async () => {
    // 仅在非开发模式下混淆
    if (
      process.env.npm_lifecycle_event === 'dev' ||
      process.env.NO_OBFUSCATION === 'true'
    ) {
      console.log('Skipping obfuscation in dev mode')
      return
    }

    console.log('Starting obfuscation...')
    const distDir = path.resolve(__dirname, 'dist')

    // 确保目录存在
    if (!fs.existsSync(distDir)) return

        const files = getAllFiles(distDir)
    
        for (const file of files) {
          // 防止重复混淆 renderer 文件 (vite 已经处理过了)
          // 使用正则兼容 Windows (\) 和 Mac (/) 路径分隔符
          if (/[\\/]renderer[\\/]/.test(file)) continue
    
          // 只混淆 .js 和 .cjs 文件      if (!file.endsWith('.js') && !file.endsWith('.cjs')) continue

      // 跳过 map 文件
      if (file.endsWith('.map')) continue

      console.log(`Obfuscating: ${file}`)
      const content = fs.readFileSync(file, 'utf8')

      const obfuscationResult = JavaScriptObfuscator.obfuscate(content, {
        target: 'node',
        compact: true,
        controlFlowFlattening: true, // 开启控制流扁平化
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: false, // 避免体积膨胀过大
        debugProtection: false, // Electron 环境慎用
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        renameGlobals: false,
        rotateStringArray: true,
        selfDefending: false, // 可能会导致 worker 报错
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 0.75,
        splitStrings: true,
        splitStringsChunkLength: 10,
        transformObjectKeys: true,
        unicodeEscapeSequence: false,
        ignoreRequireImports: true // 关键：防止破坏 native require
      } as any)

      fs.writeFileSync(file, obfuscationResult.getObfuscatedCode())
    }
    console.log('Obfuscation complete.')
  }
})
