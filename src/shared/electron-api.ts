import { ReloadResult, DomainRule } from './types'
import {
  IPCResponse,
  RunSQLResponse,
  ParseFileResponse,
  AIConfigResponse,
} from './api-types'

export interface ElectronAPI {
  // Generic invoke (keep for flexibility, but usage should be minimized)
  invoke: (channel: string, ...args: any[]) => Promise<IPCResponse>

  // File Operations
  selectFile: () => Promise<IPCResponse<string>>
  selectFiles: () => Promise<IPCResponse<{ path: string; size: number }[]>>
  selectDirectory: () => Promise<IPCResponse<string>>
  parseFile: (filePath: string) => Promise<ParseFileResponse>
  checkFilesConsistency: (files: any[]) => Promise<IPCResponse>
  reIngestFile: (
    fileId: string,
    filePath: string,
    tableName: string,
    sheetName?: string
  ) => Promise<IPCResponse<ReloadResult>>
  saveImage: (dataUrl: string, name?: string) => Promise<IPCResponse>
  saveFile: (
    content: string,
    extension: string,
    name: string
  ) => Promise<IPCResponse<boolean>>
  getPathForFile: (file: File) => string

  // Database Operations
  runSQL: (sql: string) => Promise<RunSQLResponse>
  getSchema: (tableName?: string) => Promise<IPCResponse>
  deleteTable: (tableName?: string) => Promise<IPCResponse>
  resetDB: () => Promise<IPCResponse>
  resetApp: () => Promise<IPCResponse>

  // AI & Analysis
  generateSQL: (prompt: string, schema: any) => Promise<IPCResponse>
  askAI: (
    query: string,
    schemas: any[],
    relations: any[],
    context?: { lastSql: string; lastQuery: string },
    language?: 'en' | 'zh',
    domainRules?: DomainRule[]
  ) => Promise<IPCResponse>
  fixSQL: (
    originalSql: string,
    error: string,
    schemas: any[],
    domainRules?: DomainRule[]
  ) => Promise<IPCResponse>
  analyzeContext: (
    schemas: any[],
    language?: 'en' | 'zh'
  ) => Promise<IPCResponse>
  generateMetricExpression: (options: {
    input: string
    columns: Array<{ name: string; type: string }>
    mode: 'generate' | 'refine'
  }) => Promise<IPCResponse<string>>

  // AI Config
  getAIConfig: () => Promise<AIConfigResponse>
  setAIConfig: (config: any) => Promise<IPCResponse>
  clearAIConfig: () => Promise<IPCResponse>

  // Export
  exportPDF: (data: any) => Promise<IPCResponse>
  exportReport: (payload: any) => Promise<IPCResponse>
  exportWebReport: (widgets: any[], config: any) => Promise<IPCResponse>

  // System / Misc
  getDeviceId: () => Promise<IPCResponse<string>>
  getUserInfo: () => Promise<IPCResponse<{ username: string }>>
  getPath: (name: string) => Promise<IPCResponse<string>>
  getAppVersion: () => Promise<IPCResponse<string>>
  secureSet: (key: string, value: string) => Promise<IPCResponse<boolean>>
  secureGet: (key: string) => Promise<IPCResponse<string | null>>
  openExternal: (url: string) => Promise<IPCResponse>
  setLanguage: (lang: 'en' | 'zh') => Promise<IPCResponse>

  // Environment
  platform: string
  version: NodeJS.ProcessVersions

  // Window Control
  windowControl: (
    action: 'enter-fullscreen' | 'exit-fullscreen' | 'toggle-maximize'
  ) => void
  onWindowStateChanged: (
    callback: (state: { isFullScreen: boolean }) => void
  ) => () => void
  onFileProgress: (
    callback: (data: { fileId: string; progress: number }) => void
  ) => () => void
  onCommandCloseProject: (callback: () => void) => () => void
}
