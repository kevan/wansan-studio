import { ipcMain, dialog } from 'electron'
import { DatabaseService } from '../database/duckdb'
import { FileService } from './file'
import { AIService } from './ai'

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
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (result.canceled) {
        return { success: false, error: 'User cancelled' }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      console.error('Select file error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // 选择多个文件对话框
  ipcMain.handle('select-files', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Data Files', extensions: ['xlsx', 'xls', 'csv'] },
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (result.canceled) {
        return { success: false, error: 'User cancelled' }
      }

      return { success: true, data: result.filePaths }
    } catch (error) {
      console.error('Select files error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // 执行 SQL
  ipcMain.handle('run-sql', async (_event, sql: string) => {
    try {
      const result = await databaseService.query(sql)
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

  // AI 生成 SQL
  ipcMain.handle(
    'generate-sql',
    async (_event, prompt: string, schema: any) => {
      try {
        const result = await aiService.generateSQL(prompt, schema)
        return { success: true, data: result }
      } catch (error) {
        console.error('Generate SQL error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // 导出 PDF
  ipcMain.handle('export-pdf', async (_event, _data: any) => {
    try {
      // TODO: 实现 PDF 导出功能
      return { success: true, data: 'PDF export not implemented yet' }
    } catch (error) {
      console.error('Export PDF error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  console.log('IPC handlers registered successfully')
}
