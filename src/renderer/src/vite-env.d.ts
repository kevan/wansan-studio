/// <reference types="vite/client" />

interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

interface ElectronAPI {
  // IPC 通信
  invoke: (channel: string, ...args: any[]) => Promise<IPCResponse<any>>

  // 文件操作
  selectFile: () => Promise<IPCResponse<string>>
  selectFiles: () => Promise<IPCResponse<string[]>>
  parseFile: (filePath: string) => Promise<IPCResponse<any>>

  // 数据库操作
  runSQL: (sql: string) => Promise<IPCResponse<any>>
  getSchema: (tableName?: string) => Promise<IPCResponse<any>>

  // AI 功能
  askAI: (
    query: string,
    schemas: any[],
    relations: any[],
    context?: { lastSql: string; lastQuery: string },
    language?: 'en' | 'zh'
  ) => Promise<IPCResponse<any>>
  fixSQL: (originalSql: string, error: string, schemas: any[]) => Promise<IPCResponse<{ sql: string; reasoning: string }>>
  analyzeContext: (schemas: any[], language?: 'en' | 'zh') => Promise<IPCResponse<any>>
  getAIConfig: () => Promise<IPCResponse<any>>
  setAIConfig: (config: any) => Promise<IPCResponse<any>>
  clearAIConfig: () => Promise<IPCResponse<any>>

  // 文件同步
  checkFilesConsistency: (files: any[]) => Promise<IPCResponse<any>>
  reIngestFile: (filePath: string, tableName: string) => Promise<IPCResponse<any>>

  // 导出功能
  exportPDF: (data: any) => Promise<IPCResponse<any>>
  saveImage: (dataUrl: string, name?: string) => Promise<IPCResponse<any>>
  saveFile: (content: string, extension: string, name: string) => Promise<IPCResponse<any>>
  exportReport: (payload: {
    type: 'pdf' | 'html' | 'png'
    title: string
    layoutOptions: { isA4: boolean; landscape?: boolean }
  }) => Promise<IPCResponse<any>>

  // 系统信息
  getDeviceId: () => Promise<IPCResponse<string>>
  secureSet: (key: string, value: string) => Promise<IPCResponse<boolean>>
  secureGet: (key: string) => Promise<IPCResponse<string | null>>
  platform: NodeJS.Platform
  version: NodeJS.ProcessVersions
  windowControl: (action: 'enter-fullscreen' | 'exit-fullscreen' | 'toggle-maximize') => void

  // Open external URLs
  openExternal: (url: string) => Promise<IPCResponse<any>>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.gif' {
  const src: string
  export default src
}
