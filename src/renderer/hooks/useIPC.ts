import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AIConfigResponse,
  AnalyzeContextResponse,
  AskAIResponse,
  IPCResponse,
  RunSQLResponse,
  ExportExcelPayload,
} from '@shared/api-types'
import { ElectronAPI } from '@shared/electron-api'
import type {
  AIConfig,
  ColumnSchema,
  InsightResult,
  TableSchema,
} from '@shared/types'
import { InsightGenerationContext } from '@shared/types/dashboard.ts'

/**
 * Mock IPC implementation for development/testing when electronAPI is not available.
 * This ensures the renderer can still run in a browser environment if needed.
 */
const mockIPC: ElectronAPI = {
  invoke: async () => ({ success: true }),
  selectFile: () => Promise.resolve({ success: true, data: '' }),
  selectFiles: () => Promise.resolve({ success: true, data: [] }),
  inspectFile: () => Promise.resolve({ success: true, data: [] }),
  prepareFile: () => Promise.resolve({ success: true, data: { tempFilePath: '', rowCount: 0, columns: [], preview: [] } }),
  selectDirectory: () => Promise.resolve({ success: true, data: '' }),
  parseFile: async () => ({ success: true, data: [] }),
  runSQL: async (): Promise<RunSQLResponse> => {
    await new Promise(r => setTimeout(r, 500))
    return { success: true, data: { data: [], columnFields: [] } }
  },
  getSchema: async () => ({ success: true, data: { tables: [] } }),
  deleteTable: async () => ({ success: true }),
  generateSQL: async () => ({ success: true, data: '' }),
  askAI: async (): Promise<AskAIResponse> => ({
    success: true,
    data: { status: 'success' },
  }),
  fixSQL: async () => ({
    success: true,
    data: { sql: '', reasoning: '' },
  }),
  analyzeContext: async (): Promise<AnalyzeContextResponse> => ({
    success: true,
    data: {
      relationships: [],
      suggestedPrompts: [],
    },
  }),
  analyzeSemantics: async () => ({ success: true, data: {} }),
  generateMetricExpression: async () => ({
    success: true,
    data: '1 + 1',
  }),
  generateInsight: async () => ({
    success: true,
    data: {
      summary: 'Mock Insight Summary',
      findings: [
        {
          id: '1',
          markdown: 'Mock Finding: Sales are trending upwards.',
          relatedItems: [],
        },
      ],
    } as any,
  }),
  getAIConfig: async (): Promise<AIConfigResponse> => {
    return { success: true, data: {} }
  },
  setAIConfig: async () => ({ success: true }),
  clearAIConfig: async (): Promise<IPCResponse> => {
    return { success: true }
  },
  verifyAIConnection: async (config?: any) => {
    console.log('Mock verifyAIConnection', config)
    return { success: true, data: true }
  },
  validateColumnTypes: async (params: any) => {
    console.log('Mock validateColumnTypes', params)
    return { success: true, data: { valid: true } }
  },
  reIngestFile: async (
    fileId: string,
    filePath: string,
    tableName: string,
    sheetName?: string,
    columns?: ColumnSchema[],
    _readOptions?: Record<string, any>
  ) => ({
    success: true,
    data: { lastModified: Date.now(), newColumns: columns || [] },
  }),
  ingestPreCheck: async () => ({
    success: true,
    data: {
      totalRows: 0,
      duplicateRows: 0,
      columnMatch: { matched: [], missing: [], extra: [] },
    },
  }),
  appendData: async () => ({ success: true, data: { rowCount: 0 } }),
  createTableFromSource: async () => ({
    success: true,
    data: { rowCount: 0, columns: [] },
  }),
  cleanupIngestion: async () => ({ success: true }),
  cleanupAllStaging: async () => ({ success: true }),
  getUniqueTableName: async () => ({ success: true, data: 't_mock' }),
  getDeviceId: async (): Promise<IPCResponse<string>> => {
    return { success: true, data: 'mock-device-id' }
  },
  secureSet: async (
    _key: string,
    _value: string
  ): Promise<IPCResponse<boolean>> => {
    return { success: true, data: true }
  },
  secureGet: async (_key: string): Promise<IPCResponse<string | null>> => {
    return { success: true, data: null }
  },
  validateLicense: async (_key: string): Promise<IPCResponse<boolean>> => {
    return { success: true, data: true }
  },
  testDBConnection: async () => ({ success: true, data: true }),
  listDBTables: async () => ({ success: true, data: [] }),
  syncDBTable: async () => ({
    success: true,
    data: { rowCount: 0, columns: [] },
  }),
  exportPDF: async (_data: unknown): Promise<IPCResponse> => {
    return { success: true }
  },
  exportReport: async (_payload: unknown): Promise<IPCResponse> => {
    return { success: true }
  },
  exportWebReport: async (
    _widgets: unknown[],
    _config: unknown
  ): Promise<IPCResponse> => {
    return { success: true }
  },
  exportExcel: async (_payload: ExportExcelPayload): Promise<IPCResponse<string>> => {
    return { success: true, data: '/mock/path/export.xlsx' }
  },
  resetDB: async (): Promise<IPCResponse> => {
    return { success: true }
  },
  resetApp: async (): Promise<IPCResponse> => {
    return { success: true }
  },
  saveImage: async (_dataUrl: string, _name?: string): Promise<IPCResponse> => {
    return { success: true }
  },
  saveFile: async (
    _content: string,
    _extension: string,
    _name: string
  ): Promise<IPCResponse<string>> => {
    return { success: true, data: '/mock/path/file.txt' }
  },
  openExternal: async (_url: string): Promise<IPCResponse> => {
    return { success: true }
  },
  showItemInFolder: async (_path: string): Promise<IPCResponse> => {
    console.log('Mock showItemInFolder', _path)
    return { success: true }
  },
  setLanguage: async (_lang: 'en' | 'zh'): Promise<IPCResponse> => {
    return { success: true }
  },
  getUserInfo: async (): Promise<IPCResponse<{ username: string }>> => {
    return { success: true, data: { username: 'Guest' } }
  },
  getPath: async (_name: string): Promise<IPCResponse<string>> => {
    return { success: true, data: '/mock/path' }
  },
  getAppVersion: async (): Promise<IPCResponse<string>> => {
    return { success: true, data: '0.3.2' }
  },
  getMainLogs: async (): Promise<IPCResponse<any[]>> => {
    return {
      success: true,
      data: [{ level: 'info', message: 'Mock Main Log' }],
    }
  },
  getPathForFile: (file: File) => file.name, // Mock
  windowControl: (
    _action: 'enter-fullscreen' | 'exit-fullscreen' | 'toggle-maximize'
  ) => {
    console.log('Mock windowControl', _action)
  },
  platform: 'darwin',
  version: { node: 'mock', chrome: 'mock', electron: 'mock' } as any,
  onWindowStateChanged: () => () => {},
  onFileProgress: () => () => {},
  onCommandCloseProject: () => () => {},
  onParseProgress: () => () => {},
  onRemoteConfig: () => () => {},
}

function getIpc() {
  if (window.electronAPI) {
    return window.electronAPI
  } else if (import.meta.env.DEV) {
    return mockIPC
  }
  throw new Error('Electron API not available')
}

/**
 * A helper hook for simple IPC queries
 */
function useIPC<T>(method: keyof ElectronAPI, args: any[]) {
  return useQuery({
    queryKey: [method, ...args],
    queryFn: async () => {
      const fn = getIpc()[method] as any
      const response = await fn(...args)
      if (!response.success) {
        throw new Error(response.error || `IPC error in ${method}`)
      }
      return response.data as T
    },
  })
}

export function useRunSQL() {
  return useMutation({
    mutationFn: async (sql: string) => {
      const response = await getIpc().runSQL(sql)
      if (!response.success) {
        throw new Error(response.error || 'SQL execution failed')
      }
      return response.data
    },
  })
}

export function useGetSchema() {
  return useQuery({
    queryKey: ['schema'],
    queryFn: async () => {
      const response = await getIpc().getSchema()
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch schema')
      }
      return response.data
    },
  })
}

export function useDeleteTable() {
  return useMutation({
    mutationFn: async (tableName: string) => {
      const response = await getIpc().deleteTable(tableName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete table')
      }
      return response.data
    },
  })
}

export function useGenerateSQL() {
  return useMutation({
    mutationFn: async ({
      prompt,
      schema,
    }: {
      prompt: string
      schema: TableSchema[]
    }) => {
      const response = await getIpc().generateSQL(prompt, schema)
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate SQL')
      }
      return response.data
    },
  })
}

export function useAIConfig() {
  return useQuery({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const response = await getIpc().getAIConfig()
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch AI config')
      }
      return response.data
    },
  })
}

export function useSetAIConfig() {
  return useMutation({
    mutationFn: async (config: AIConfig) => {
      const response = await getIpc().setAIConfig(config)
      if (!response.success) {
        throw new Error(response.error || 'Failed to set AI config')
      }
      return response.data
    },
  })
}

export function useParseFile() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const response = await getIpc().parseFile(filePath)
      if (!response.success) {
        throw new Error(response.error || 'Failed to parse file')
      }
      return response.data
    },
  })
}

export function useSelectFiles() {
  return useMutation({
    mutationFn: async () => {
      const response = await getIpc().selectFiles()
      if (!response.success) {
        throw new Error(response.error || 'Failed to select files')
      }
      return response.data
    },
  })
}

export function useUserInfo() {
  return useQuery({
    queryKey: ['user-info'],
    queryFn: async () => {
      const response = await getIpc().getUserInfo()
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user info')
      }
      return response.data
    },
  })
}

export function usePlatform() {
  return getIpc().platform
}

export function useExportWebReport() {
  return useMutation({
    mutationFn: async ({
      widgets,
      config,
      fullSnapshot,
    }: {
      widgets: any[]
      config: { title: string; theme: string; language?: 'en' | 'zh' }
      fullSnapshot?: any
    }) => {
      const response = await getIpc().exportWebReport(
        widgets,
        config,
        fullSnapshot
      )
      if (!response.success) {
        throw new Error(response.error || 'Failed to export web report')
      }
      return (response as any).filePath
    },
  })
}

export function useReIngestFile() {
  return useMutation({
    mutationFn: async ({
      fileId,
      filePath,
      tableName,
      sheetName,
      columns,
      readOptions,
    }: {
      fileId: string
      filePath: string
      tableName: string
      sheetName?: string
      columns?: ColumnSchema[]
      readOptions?: Record<string, any>
    }) => {
      const response = await getIpc().reIngestFile(
        fileId,
        filePath,
        tableName,
        sheetName,
        columns,
        readOptions
      )
      if (!response.success) {
        throw new Error(response.error || 'Failed to re-ingest file')
      }
      return response.data
    },
  })
}

export function useContextAnalysis() {
  return useMutation({
    mutationFn: async ({
      schemas,
      language,
    }: {
      schemas: TableSchema[]
      language?: 'en' | 'zh'
    }) => {
      const response = await getIpc().analyzeContext(schemas, language)
      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze context')
      }
      return response.data
    },
  })
}

export function useGetAppVersion() {
  return useIPC('getAppVersion', [])
}

export function useGetMainLogs() {
  return useIPC('getMainLogs', [])
}

export function useGenerateInsight() {
  return useMutation({
    mutationFn: async (
      context: InsightGenerationContext
    ): Promise<InsightResult> => {
      const response = await getIpc().generateInsight(context)
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate insight')
      }
      // Handle legacy string response fallback
      if (typeof response.data === 'string') {
        return {
          summary: 'Analysis',
          findings: [{ id: '0', markdown: response.data }],
        }
      }
      return response.data as InsightResult
    },
  })
}
