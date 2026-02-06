import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { ElectronAPI } from '../shared/electron-api'
import { InsightGenerationContext } from '../shared/types/dashboard'

// 定义暴露给渲染进程的 API
const electronAPI: ElectronAPI = {
  // IPC 通信
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),

  // 文件操作
  selectFile: () => ipcRenderer.invoke('file.selectFile'),
  selectFiles: () => ipcRenderer.invoke('file.selectFiles'),
  selectDirectory: () => ipcRenderer.invoke('file.selectDirectory'),
  parseFile: (filePath: string) =>
    ipcRenderer.invoke('file.parseFile', filePath),
  inspectFile: (filePath: string) =>
    ipcRenderer.invoke('file.inspectFile', filePath),
  prepareFile: (params: any) => ipcRenderer.invoke('file.prepareFile', params),

  // 数据库操作
  runSQL: (sql: string) => ipcRenderer.invoke('sql.runSQL', sql),
  getUniqueTableName: (params: any) =>
    ipcRenderer.invoke('file.getUniqueTableName', params),
  generateSQL: (params: any) => ipcRenderer.invoke('sql.generateSQL', params),
  getSchema: (tableName?: string) =>
    ipcRenderer.invoke('db.getSchema', tableName),
  deleteTable: (tableName: string) =>
    ipcRenderer.invoke('db.deleteTable', tableName),
  resetDB: () => ipcRenderer.invoke('db.resetDB'),
  resetApp: () => ipcRenderer.invoke('app.resetApp'),

  // AI 功能
  askAI: (params: any) => ipcRenderer.invoke('ai.askAI', params),
  fixSQL: (params: any) => ipcRenderer.invoke('ai.fixSQL', params),
  analyzeContext: (params: any) =>
    ipcRenderer.invoke('ai.analyzeContext', params),
  analyzeSemantics: (params: any) =>
    ipcRenderer.invoke('ai.analyzeSemantics', params),
  generateMetricExpression: (options: any) =>
    ipcRenderer.invoke('ai.generateMetricExpression', options),
  generateInsight: (context: InsightGenerationContext) =>
    ipcRenderer.invoke('ai.generateInsight', context),
  aiPreviewExtract: (params: any) =>
    ipcRenderer.invoke('ai.aiPreviewExtract', params),
  aiBatchExtract: (params: any) =>
    ipcRenderer.invoke('ai.aiBatchExtract', params),

  // Token Audit
  getTokenConfig: () => ipcRenderer.invoke('audit.getTokenConfig'),
  setTokenConfig: (config: any) =>
    ipcRenderer.invoke('audit.setTokenConfig', config),
  getTokenUsage: () => ipcRenderer.invoke('audit.getTokenUsage'),

  getAIConfig: () => ipcRenderer.invoke('ai.getAIConfig'),
  setAIConfig: (config: any) => ipcRenderer.invoke('ai.setAIConfig', config),
  clearAIConfig: () => ipcRenderer.invoke('ai.clearAIConfig'),
  verifyAIConnection: (config?: any) =>
    ipcRenderer.invoke('ai.verifyAIConnection', config),

  // 文件同步
  validateColumnTypes: (params: any) =>
    ipcRenderer.invoke('file.validateColumnTypes', params),
  reIngestFile: (params: any) =>
    ipcRenderer.invoke('file.reIngestFile', params),
  ingestPreCheck: (params: any) =>
    ipcRenderer.invoke('ingest.ingestPreCheck', params),
  appendData: (params: any) => ipcRenderer.invoke('ingest.appendData', params),
  createTableFromSource: (params: any) =>
    ipcRenderer.invoke('ingest.createTableFromSource', params),
  cleanupIngestion: (params: any) =>
    ipcRenderer.invoke('ingest.cleanupIngestion', params),

  cleanupAllStaging: () => ipcRenderer.invoke('ingest.cleanupAllStaging'),
  ingestJson: (params: any) => ipcRenderer.invoke('ingest.ingestJson', params),

  // Database Connectors
  testDBConnection: (params: any) =>
    ipcRenderer.invoke('db.testDBConnection', params),
  listDBTables: (config: any) => ipcRenderer.invoke('db.listDBTables', config),
  syncDBTable: (params: any) => ipcRenderer.invoke('db.syncDBTable', params),

  // 导出功能
  exportPDF: (data: any) => ipcRenderer.invoke('export.exportPDF', data),
  saveImage: (params: any) => ipcRenderer.invoke('save.saveImage', params),
  saveFile: (params: any) => ipcRenderer.invoke('save.saveFile', params),
  exportReport: (payload: any) =>
    ipcRenderer.invoke('export.exportReport', payload),
  exportWebReport: (params: any) =>
    ipcRenderer.invoke('export.exportWebReport', params),
  exportExcel: (payload: any) =>
    ipcRenderer.invoke('export.exportExcel', payload),

  // System
  getDeviceId: () => ipcRenderer.invoke('sys.getDeviceId'),
  getUserInfo: () => ipcRenderer.invoke('sys.getUserInfo'),
  getPath: (name: string) => ipcRenderer.invoke('sys.getPath', name),
  getAppVersion: () => ipcRenderer.invoke('sys.getAppVersion'),
  getMainLogs: () => ipcRenderer.invoke('sys.getMainLogs'),
  secureSet: (params: any) => ipcRenderer.invoke('sys.secureSet', params),
  secureGet: (key: string) => ipcRenderer.invoke('sys.secureGet', key),
  validateLicense: (key: string) =>
    ipcRenderer.invoke('sys.validateLicense', key),
  platform: process.platform,
  version: process.versions,
  windowControl: (
    action: 'enter-fullscreen' | 'exit-fullscreen' | 'toggle-maximize'
  ) => ipcRenderer.send('window-control', action),

  // Open external URLs in user's default browser
  openExternal: (url: string) => ipcRenderer.invoke('sys.openExternal', url),
  showItemInFolder: (path: string) =>
    ipcRenderer.invoke('sys.showItemInFolder', path),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  setLanguage: (lang: 'en' | 'zh') =>
    ipcRenderer.invoke('app.setLanguage', lang),

  // Project Management
  projectCreate: (params: any) =>
    ipcRenderer.invoke('project.projectCreate', params),
  projectOpen: (projectPath?: string) =>
    ipcRenderer.invoke('project.projectOpen', projectPath),
  projectSave: (params: any) =>
    ipcRenderer.invoke('project.projectSave', params),
  projectClose: () => ipcRenderer.invoke('project.projectClose'),
  projectGetDefaultPath: () =>
    ipcRenderer.invoke('project.projectGetDefaultPath'),

  // 事件监听
  onWindowStateChanged: (
    callback: (state: { isFullScreen: boolean }) => void
  ) => {
    const listener = (_event: any, state: { isFullScreen: boolean }) =>
      callback(state)
    ipcRenderer.on('window-state-changed', listener)
    return () => ipcRenderer.removeListener('window-state-changed', listener)
  },
  onFileProgress: (
    callback: (data: { fileId: string; progress: number }) => void
  ) => {
    const listener = (
      _event: any,
      data: { fileId: string; progress: number }
    ) => callback(data)
    ipcRenderer.on('file:progress', listener)
    return () => ipcRenderer.removeListener('file:progress', listener)
  },
  onParseProgress: (
    callback: (data: { filePath: string; count: number }) => void
  ) => {
    const listener = (_event: any, data: { filePath: string; count: number }) =>
      callback(data)
    ipcRenderer.on('file:parse-progress', listener)
    return () => ipcRenderer.removeListener('file:parse-progress', listener)
  },
  onCommandCloseProject: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('command:close-project', listener)
    return () => ipcRenderer.removeListener('command:close-project', listener)
  },
  onRemoteConfig: (callback: (config: any) => void) => {
    const listener = (_event: any, config: any) => callback(config)
    ipcRenderer.on('app:remote-config', listener)
    return () => ipcRenderer.removeListener('app:remote-config', listener)
  },
}

// 将 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
