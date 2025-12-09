import { ipcMain, dialog } from 'electron'
import { DatabaseService } from '../database/duckdb'
import { FileService } from './file'
import { AIService } from './ai'
import { executeSQL } from '../engine/executor'
import { checkFilesConsistency } from '../engine/file-watcher'
import type {
  TableSchema,
  FileNode,
  RelationSuggestion,
} from '../../shared/types'

export function setupIPC(
  databaseService: DatabaseService,
  aiService: AIService
) {
  const fileService = new FileService(databaseService)

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
        filters: [{ name: 'Data Files', extensions: ['xlsx', 'xls', 'csv'] }],
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
        filters: [{ name: 'Data Files', extensions: ['xlsx', 'xls', 'csv'] }],
      })

      if (result.canceled) {
        return { success: false, error: 'User cancelled' }
      }

      return { success: true, data: result.filePaths }
    } catch (error) {
      return { success: false, error: 'Multi-file selection error' }
    }
  })

  // 执行 SQL
  ipcMain.handle('run-sql', async (_event, sql: string) => {
    try {
      const result = await executeSQL(sql, databaseService.getDb())
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
      context?: { lastSql: string; lastQuery: string }
    ) => {
      try {
        const result = await aiService.getAnalysis(
          userQuery,
          schemas,
          relations,
          context
        )
        return { success: true, data: result }
      } catch (error) {
        console.error('Generate analysis error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // AI 修复 SQL
  ipcMain.handle(
    'ask-ai-fix',
    async (
      _event,
      originalSql: string,
      error: string,
      schemas: TableSchema[]
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
    }
  )

  // AI 推断关系
  ipcMain.handle(
    'infer-relationships',
    async (_event, schemas: TableSchema[]) => {
      try {
        const result = await aiService.getRelationSuggestions(schemas)
        return { success: true, data: result }
      } catch (error) {
        console.error('Infer relationships error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
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
    }
  )

  // 重新摄取文件
  ipcMain.handle(
    're-ingest-file',
    async (_event, filePath: string, tableName: string) => {
      try {
        const result = await fileService.reIngestFile(filePath, tableName)
        return { success: true, data: result }
      } catch (error) {
        console.error('Re-ingest file error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  console.log('IPC handlers registered and updated successfully')
}
