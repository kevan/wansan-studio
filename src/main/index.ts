import { app, BrowserWindow, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { isDev } from './utils/env'
import Store from 'electron-store'
import debounce from 'lodash.debounce'

import { setupIPC } from './services/ipc'
import { DatabaseService } from './database/duckdb'
import { AIService } from './services/ai' // Import AIService

class WansanApp {
  private mainWindow: BrowserWindow | null = null
  private databaseService: DatabaseService | null = null
  private aiService: AIService | null = null // Add AIService property

  constructor() {
    this.init()
  }

  private async init() {
    // 加载环境变量 (仅开发模式)
    if (isDev()) {
      try {
        const dotenv = await import('dotenv')
        const envPath = join(app.getAppPath(), '.env')
        const result = dotenv.config({ path: envPath })
        console.log(`[Main] Loading .env from ${envPath}`)
        console.log(
          '[Main] .env loaded result:',
          result.parsed ? Object.keys(result.parsed).join(',') : 'No keys',
          'Error:',
          result.error
        )
        console.log('[Main] OPENAI_MODEL from env:', process.env.OPENAI_MODEL)
      } catch (error) {
        console.error('Failed to load .env file:', error)
      }
    }

    // 等待 Electron 准备就绪
    await app.whenReady()

    // 初始化数据库服务
    const databaseService = new DatabaseService()
    await databaseService.initialize()
    this.databaseService = databaseService

    // 创建 AI Service 实例
    this.aiService = new AIService()

    // 创建主窗口
    this.createMainWindow()

    // 设置 IPC 通信
    this.setupIPC()

    // 在开发模式下启动时清理 AI 配置
    // if (isDev()) {
    //   this.aiService.clearConfig()
    // }

    // 设置应用事件监听
    this.setupAppEvents()
  }

  private createMainWindow() {
    const store = new Store()
    const defaultBounds = { width: 1280, height: 800 }
    const bounds = store.get('windowBounds', defaultBounds) as any

    const resourcesDir = join(process.cwd(), 'resources')
    const devWindowIconPath =
      process.platform === 'win32'
        ? join(resourcesDir, 'icon.ico')
        : join(resourcesDir, 'icon.png')

    const setDockIcon = () => {
      if (!isDev() || process.platform !== 'darwin') return
      const icnsIcon = nativeImage.createFromPath(
        join(resourcesDir, 'icon.icns')
      )
      const pngFallback = nativeImage.createFromPath(
        join(resourcesDir, 'icon.png')
      )
      const iconToUse = !icnsIcon.isEmpty() ? icnsIcon : pngFallback
      if (iconToUse.isEmpty()) return
      try {
        app.dock.setIcon(icnsIcon)
      } catch (error) {
        console.warn('Failed to set dock icon:', error)
      }
    }

    setDockIcon()

    this.mainWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      minWidth: 1024,
      minHeight: 600,
      autoHideMenuBar: true,
      ...(isDev() && process.platform !== 'darwin'
        ? { icon: devWindowIconPath }
        : {}),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(app.getAppPath(), 'dist/preload/index.cjs'),
        // [CRITICAL] Disable DevTools in Production
        devTools: !app.isPackaged,
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false, // 先隐藏，加载完成后再显示
    })

    const saveState = debounce(() => {
      if (!this.mainWindow) return
      try {
        store.set('windowBounds', this.mainWindow.getBounds())
      } catch (e) {
        console.error('Failed to save window bounds', e)
      }
    }, 1000)

    this.mainWindow.on('resize', saveState)
    this.mainWindow.on('move', saveState)

    // 加载应用
    if (isDev()) {
      this.mainWindow.loadURL('http://localhost:5173')
    } else {
      // 在生产环境中，loadFile 默认相对于 app.getAppPath() (即 app.asar)
      // 尝试直接加载 dist/renderer/index.html
      const entry = 'dist/renderer/index.html'
      this.mainWindow.loadFile(entry).catch(e => {
        console.error('Failed to load local file:', entry, e)
      })
    }

    // 窗口准备好后显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
      setDockIcon()
    })

    // 监听全屏状态变化，同步给渲染进程（处理系统级退出全屏）
    this.mainWindow.on('leave-full-screen', () => {
      this.mainWindow?.webContents.send('window-state-changed', { isFullScreen: false })
    })
    
    this.mainWindow.on('enter-full-screen', () => {
      this.mainWindow?.webContents.send('window-state-changed', { isFullScreen: true })
    })

    // 窗口关闭事件
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    ipcMain.on('window-control', (event, action) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      switch (action) {
        case 'enter-fullscreen':
          win.setFullScreen(true)
          break
        case 'exit-fullscreen':
          win.setFullScreen(false)
          break
        case 'toggle-maximize':
          if (win.isMaximized()) win.unmaximize()
          else win.maximize()
          break
        default:
          break
      }
    })
  }

  private setupIPC() {
    if (!this.databaseService || !this.aiService) {
      throw new Error('Services not initialized')
    }

    setupIPC(this.databaseService, this.aiService)
  }

  private setupAppEvents() {
    // 应用退出处理
    app.on('window-all-closed', () => {
      app.quit()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow()
      }
    })

    // 应用退出前清理
    app.on('before-quit', async () => {
      if (this.databaseService) {
        await this.databaseService.close()
      }
    })
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public getDatabaseService(): DatabaseService | null {
    return this.databaseService
  }

  public getAIService(): AIService | null {
    return this.aiService
  }
}

// 创建应用实例
const wansanApp = new WansanApp()

export { wansanApp }
