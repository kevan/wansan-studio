import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { isDev } from './utils/env'

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
    this.aiService = new AIService(databaseService)

    // 创建主窗口
    this.createMainWindow()

    // 设置 IPC 通信
    this.setupIPC()

    // 在开发模式下启动时清理 AI 配置
    if (isDev()) {
      this.aiService.clearConfig()
    }

    // 设置应用事件监听
    this.setupAppEvents()
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(app.getAppPath(), 'dist/preload/index.cjs'),
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false, // 先隐藏，加载完成后再显示
    })

    // 加载应用
    if (isDev()) {
      this.mainWindow.loadURL('http://localhost:5173')
    } else {
      this.mainWindow.loadFile(join(__dirname, '../../renderer/index.html'))
    }

    // 窗口准备好后显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()

      // if (isDev()) {
      //   this.mainWindow?.webContents.openDevTools()
      // }
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
    // macOS 特殊处理
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
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
