// Vite 环境变量类型
/// <reference types="vite/client" />

// Vite 定义的全局变量
declare const __IS_DEV__: boolean

// ElectronAPI 接口定义，手动同步自 src/preload/index.ts
interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>

  selectFile: () => Promise<IPCResponse<string>>
  selectFiles: () => Promise<IPCResponse<string[]>>
  parseFile: (filePath: string) => Promise<IPCResponse<any[]>>

  runSQL: (sql: string) => Promise<IPCResponse<any>>
  getSchema: (tableName?: string) => Promise<IPCResponse<any>>
  deleteTable: (tableName: string) => Promise<IPCResponse<void>>
  resetDB: () => Promise<IPCResponse<void>>

  askAI: (
    query: string,
    schemas: any[],
    relations: any[],
    context?: { lastSql: string; lastQuery: string },
    language?: 'en' | 'zh'
  ) => Promise<IPCResponse<any>>
  fixSQL: (originalSql: string, error: string, schemas: any[]) => Promise<IPCResponse<any>>
  analyzeContext: (schemas: any[], language?: 'en' | 'zh') => Promise<IPCResponse<any>>
  getAIConfig: () => Promise<IPCResponse<any>>
  setAIConfig: (config: any) => Promise<IPCResponse<void>>
  clearAIConfig: () => Promise<IPCResponse<void>>

  checkFilesConsistency: (files: any[]) => Promise<IPCResponse<any>>
  reIngestFile: (filePath: string, tableName: string, sheetName?: string) => Promise<IPCResponse<any>>

  exportPDF: (data: any) => Promise<IPCResponse<any>>
  saveImage: (dataUrl: string, name?: string) => Promise<IPCResponse<void>>
  saveFile: (content: string, extension: string, name: string) => Promise<IPCResponse<void>>
  exportReport: (payload: {
    type: 'pdf' | 'html' | 'png'
    title: string
    layoutOptions: { isA4: boolean; landscape?: boolean }
  }) => Promise<IPCResponse<any>>

  platform: string
  version: NodeJS.ProcessVersions
  windowControl: (action: 'enter-fullscreen' | 'exit-fullscreen' | 'toggle-maximize') => void

  secureSet: (key: string, value: string) => Promise<boolean>
  secureGet: (key: string) => Promise<string | null>

  openExternal: (url: string) => Promise<IPCResponse<void>>
  getPathForFile: (file: File) => string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// 数据库相关类型
export interface DatabaseSchema {
  tableName: string
  columns: DatabaseColumn[]
}

export interface DatabaseColumn {
  name: string
  type: string
  nullable: boolean
}

// 文件解析结果类型
export interface ParseFileResult {
  tableName: string
  schema: DatabaseSchema
  rowCount: number
  preview: any[][]
}

// IPC 响应类型
export interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// AI 相关类型
export interface GenerateSQLRequest {
  prompt: string
  schema: DatabaseSchema
}

// 应用状态类型
export interface AppState {
  currentTable: string | null
  isLoading: boolean
  error: string | null
}

// 查询历史类型
export interface QueryHistory {
  id: string
  timestamp: Date
  query: string
  type: 'natural' | 'sql'
  result?: any[]
  error?: string
}