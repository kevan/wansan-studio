import { ipcMain, dialog } from 'electron'
import { DatabaseService } from '../database/duckdb'
import { FileService } from './file'
import { AIService } from './ai'
import { executeSQL } from '../engine/executor'
import type { TableSchema } from '../../shared/types'

export function setupIPC(databaseService: DatabaseService) {
  const fileService = new FileService(databaseService)
  const aiService = new AIService()

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
        filters: [
          { name: 'Data Files', extensions: ['xlsx', 'xls', 'csv'] },
        ],
      })

      if (result.canceled) {
        return { success: false, error: 'User cancelled' }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      return { success: false, error: 'File selection error' }
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
    async (_event, userQuery: string, schemas: TableSchema[]) => {
      try {
        const result = await aiService.getAnalysis(userQuery, schemas)
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

  console.log('IPC handlers registered and updated successfully')
}
