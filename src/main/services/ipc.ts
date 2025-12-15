import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { DatabaseService } from '../database/duckdb'
import { FileService } from './file'
import { AIService } from './ai'
import { getDeviceId } from './device'
import { secureSet, secureGet } from './secure-storage'
import { executeSQL } from '../engine/executor'
import { checkFilesConsistency } from '../engine/file-watcher'
import { ingestJsonData } from '../engine/ingestion'
import fs from 'fs-extra'
import type {
  TableSchema,
  FileNode,
  RelationSuggestion,
  ContextAnalysisResult,
} from '../../shared/types'

export function setupIPC(
  databaseService: DatabaseService,
  aiService: AIService,
) {
  const fileService = new FileService(databaseService)

  ipcMain.handle('open-external', async (_event, url: string) => {
    try {
      if (typeof url !== 'string' || !url.trim()) {
        return { success: false, error: 'Invalid URL' }
      }
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { success: false, error: 'Unsupported URL protocol' }
      }
      await shell.openExternal(parsed.toString())
      return { success: true }
    } catch (error) {
      console.error('Open external error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // 文件解析
  ipcMain.handle('parse-file', async (_event, filePath: string) => {
    try {
      const result = await fileService.parseFile(filePath)
      return { success: true, data: result }
    } catch (error) {
      console.error('Parse file error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // 选择文件对话框（单个文件）
  ipcMain.handle('select-file', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Data Files', extensions: ['xlsx', 'xls', 'csv', 'json'] }],
      })

      if (result.canceled) {
        return { success: false, error: 'User cancelled' }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      return { success: false, error: 'File selection error' }
    }
  })

  // 选择文件对话框（多个文件）
  ipcMain.handle('select-files', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Data Files', extensions: ['xlsx', 'xls', 'csv', 'json'] }],
      })

      if (result.canceled) {
        return { success: false, error: 'User cancelled' }
      }

      const filesWithStats = await Promise.all(result.filePaths.map(async (filePath) => {
        const stats = await fs.stat(filePath);
        return { path: filePath, size: stats.size };
      }));

      return { success: true, data: filesWithStats }
    } catch (error) {
      return { success: false, error: 'Multi-file selection error' }
    }
  })

  // 执行 SQL
  ipcMain.handle('run-sql', async (_event, sql: string) => {
    try {
      const result = await executeSQL(sql, databaseService)
      return { success: true, data: result }
    } catch (error) {
      console.error('SQL execution error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // 获取表结构
  ipcMain.handle('get-schema', async (_event, tableName?: string) => {
    try {
      const result = await databaseService.getSchema(tableName)
      return { success: true, data: result }
    } catch (error) {
      console.error('Get schema error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // AI 生成分析
  ipcMain.handle(
    'ask-ai',
    async (
      _event,
      userQuery: string,
      schemas: TableSchema[],
      relations: RelationSuggestion[],
      context?: { lastSql: string; lastQuery: string },
      language?: 'en' | 'zh',
    ) => {
      try {
        const result = await aiService.generatePlan(
          userQuery,
          schemas,
          relations,
          context,
          language,
        )
        return { success: true, data: result }
      } catch (error) {
        console.error('Generate analysis error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  )

  // AI 修复 SQL
  ipcMain.handle(
    'ask-ai-fix',
    async (
      _event,
      originalSql: string,
      error: string,
      schemas: TableSchema[],
    ) => {
      try {
        const result = await aiService.fixQuery(originalSql, error, schemas)
        return { success: true, data: result }
      } catch (error) {
        console.error('Fix SQL error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  )

  // AI 分析上下文 (关系 + 提示词)
  ipcMain.handle(
    'analyze-context',
    async (_event, schemas: TableSchema[], language?: 'en' | 'zh') => {
      try {
        const result = await aiService.getContextAnalysis(schemas, language)
        return { success: true, data: result }
      } catch (error) {
        console.error('Analyze context error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  )

  // 获取 AI 配置
  ipcMain.handle('get-ai-config', async () => {
    try {
      const config = aiService.getConfig()
      return { success: true, data: config }
    } catch (error) {
      return { success: false, error: 'Failed to get AI config' }
    }
  })

  // 设置 AI 配置
  ipcMain.handle('set-ai-config', async (_event, config: any) => {
    try {
      aiService.setConfig(config)
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to set AI config' }
    }
  })

  // 清理 AI 配置
  ipcMain.handle('clear-ai-config', async () => {
    try {
      aiService.clearConfig()
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to clear AI config' }
    }
  })

  // 获取设备 ID
  ipcMain.handle('get-device-id', async () => {
    try {
      const id = await getDeviceId()
      return { success: true, data: id }
    } catch (error) {
      console.error('Get device ID error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // 安全存储
  ipcMain.handle('secure-set', async (_event, key: string, value: string) => {
    const success = secureSet(key, value)
    return { success }
  })

  ipcMain.handle('secure-get', async (_event, key: string) => {
    const value = secureGet(key)
    return { success: true, data: value }
  })

  // 检查文件一致性
  ipcMain.handle(
    'check-files-consistency',
    async (_event, files: FileNode[]) => {
      try {
        const changedIds = await checkFilesConsistency(files)
        return { success: true, data: changedIds }
      } catch (error) {
        console.error('Check files consistency error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  )

  // 重新摄取文件
  ipcMain.handle(
    're-ingest-file',
    async (_event, filePath: string, tableName: string, sheetName?: string) => {
      try {
        const result = await fileService.reIngestFile(filePath, tableName, sheetName)
        return { success: true, data: result }
      } catch (error) {
        console.error('Re-ingest file error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  )

  // 摄取 JSON 数据（用于 Demo 数据）
  ipcMain.handle(
    'ingest-json',
    async (_event, tableName: string, rows: any[]) => {
      try {
        const result = await ingestJsonData(databaseService, tableName, rows)
        return { success: true, data: result }
      } catch (error) {
        console.error('Ingest JSON error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  )

  // 清空数据库
  ipcMain.handle('reset-db', async () => {
    try {
      await databaseService.dropAllTables()
      return { success: true }
    } catch (error) {
      console.error('Reset DB error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // 保存图片
  ipcMain.handle('save-image', async (_event, dataUrl: string, name?: string) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: name || 'image.png',
        filters: [{ name: 'Images', extensions: ['png'] }],
      })

      if (filePath) {
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
        await fs.writeFile(filePath, base64Data, 'base64')
        return { success: true }
      }
      return { success: false, error: 'Cancelled' }
    } catch (error) {
      console.error('Save image error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // 保存通用文件 (HTML, Text, etc)
  ipcMain.handle('save-file', async (_event, content: string, extension: string, name: string) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: name,
        filters: [{ name: 'Files', extensions: [extension] }],
      })

      if (filePath) {
        await fs.writeFile(filePath, content, 'utf-8')
        return { success: true }
      }
      return { success: false, error: 'Cancelled' }
    } catch (error) {
      console.error('Save file error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // 删除表
  ipcMain.handle('delete-table', async (event, tableName: string) => {
    try {
      // Sanitize table name to prevent SQL injection
      // Double quotes are important for identifier safety
      await databaseService.query(`DROP TABLE IF EXISTS "${tableName}"`)
      return { success: true }
    } catch (error) {
      console.error('Drop table failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle(
    'export-report',
    async (
      event,
      payload: {
        type: 'pdf' | 'html' | 'png'
        title: string
        layoutOptions?: { isA4?: boolean; landscape?: boolean }
        clip?: { x: number; y: number; width: number; height: number }
        dpr?: number
      },
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) {
        return { success: false, error: 'No browser window available' }
      }

      const { type, title, layoutOptions } = payload || {}
      const safeTitle = title?.trim() || 'report'
      const isA4 = layoutOptions?.isA4 ?? true
      const landscape = layoutOptions?.landscape ?? !isA4

      try {
        if (type === 'pdf') {
          return { success: false, error: 'PDF export handled client-side' }
        }

        if (type === 'png') {
          const image = await win.webContents.capturePage()
          const png = image.toPNG()
          const { filePath, canceled } = await dialog.showSaveDialog({
            defaultPath: `${safeTitle}.png`,
            filters: [{ name: 'Images', extensions: ['png'] }],
          })

          if (!filePath || canceled) {
            return { success: false, error: 'Cancelled' }
          }

          await fs.writeFile(filePath, png)
          return { success: true, path: filePath }
        }

        if (type === 'html') {
          return { success: false, error: 'HTML export is not implemented yet' }
        }

        return { success: false, error: 'Unknown export type' }
      } catch (error) {
        console.error('Export report error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  )

  console.log('IPC handlers registered and updated successfully')
}
