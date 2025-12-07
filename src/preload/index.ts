import { contextBridge, ipcRenderer } from 'electron'

// 定义暴露给渲染进程的 API
const electronAPI = {
  // IPC 通信
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),

  // 文件操作
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFiles: () => ipcRenderer.invoke('select-files'), // 多文件选择
  parseFile: (filePath: string) => ipcRenderer.invoke('parse-file', filePath),

  // 数据库操作
  runSQL: (sql: string) => ipcRenderer.invoke('run-sql', sql),
  getSchema: (tableName?: string) =>
    ipcRenderer.invoke('get-schema', tableName),

  // AI 功能
  askAI: (query: string, schemas: any[]) =>
    ipcRenderer.invoke('ask-ai', query, schemas),
  inferRelationships: (schemas: any[]) =>
    ipcRenderer.invoke('infer-relationships', schemas),
  getAIConfig: () => ipcRenderer.invoke('get-ai-config'),
  setAIConfig: (config: any) => ipcRenderer.invoke('set-ai-config', config),
  clearAIConfig: () => ipcRenderer.invoke('clear-ai-config'),

  // 导出功能
  exportPDF: (data: any) => ipcRenderer.invoke('export-pdf', data),

  // 系统信息
  platform: process.platform,
  version: process.versions,
}

// 将 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// 类型声明（用于 TypeScript）
export type ElectronAPI = typeof electronAPI
