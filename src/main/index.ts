import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { isDev } from './utils/env'
import { setupIPC } from './services/ipc'
import { DatabaseService } from './database/duckdb'

class WansanApp {
  private mainWindow: BrowserWindow | null = null
  private databaseService: DatabaseService | null = null

  constructor() {
    this.init()
  }

  private async init() {
    // 等待 Electron 准备就绪
    await app.whenReady()

    // 初始化数据库服务
    this.databaseService = new DatabaseService()
    await this.databaseService.initialize()

    // 创建主窗口
    this.createMainWindow()

    // 设置 IPC 通信
    this.setupIPC()

    // 设置应用事件监听
    this.setupAppEvents()
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js'),
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false, // 先隐藏，加载完成后再显示
    })

    // 加载应用
    if (isDev()) {
      this.mainWindow.loadURL('http://localhost:5173')
      // this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(join(__dirname, '../../renderer/index.html'))
    }

    // 窗口准备好后显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()

      if (isDev()) {
        this.mainWindow?.webContents.openDevTools()
      }
    })

    // 窗口关闭事件
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })
  }

  private setupIPC() {
    if (!this.databaseService) {
      throw new Error('Database service not initialized')
    }

    setupIPC(this.databaseService)
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
}

// 创建应用实例
const wansanApp = new WansanApp()

export { wansanApp }
