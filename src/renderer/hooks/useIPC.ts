import { useMutation, useQuery } from '@tanstack/react-query'
import type { ReloadResult } from '../../shared/types'
import type {
  IPCResponse,
  RunSQLResponse,
  ParseFileResponse,
  AIConfigResponse,
} from '../../shared/api-types'
import { ElectronAPI } from '../../shared/electron-api'

// 模拟 IPC 调用（实际实现将在主进程完成后替换）
const mockIPC: ElectronAPI = {
  invoke: async (channel: string, ...args: any[]): Promise<IPCResponse> => {
    console.log(`IPC Mock (invoke): ${channel}`, args)
    return { success: true, data: null }
  },
  selectFile: async (): Promise<IPCResponse<string>> => {
    return { success: true, data: 'mock/path/to/file.xlsx' }
  },
  selectFiles: async (): Promise<IPCResponse<{ path: string; size: number }[]>> => {
    return {
      success: true,
      data: [
        { path: 'mock/path/to/file1.xlsx', size: 1024 },
        { path: 'mock/path/to/file2.csv', size: 2048 },
      ],
    }
  },
  parseFile: async (filePath: string): Promise<ParseFileResponse> => {
    console.log(`Mock parseFile: ${filePath}`)
    return {
      success: true,
      data: [{ tableName: 'mock_table', schema: { columns: [], tableName: 'mock_table', description: '' }, rowCount: 0 }],
    }
  },
  runSQL: async (sql: string): Promise<RunSQLResponse> => {
    console.log(`Mock runSQL: ${sql}`)
    return { success: true, data: { data: [], columnTypes: {} } }
  },
  getSchema: async (tableName?: string): Promise<IPCResponse> => {
    console.log(`Mock getSchema: ${tableName}`)
    return { success: true, data: { columns: [] } }
  },
  deleteTable: async (tableName?: string): Promise<IPCResponse> => {
    console.log(`Mock deleteTable: ${tableName}`)
    return { success: true }
  },
  generateSQL: async (prompt: string, schema: any): Promise<IPCResponse> => {
    console.log(`Mock generateSQL: ${prompt}`)
    return { success: true, data: 'SELECT * FROM mock' }
  },
  askAI: async (...args: any[]): Promise<IPCResponse> => {
    console.log('Mock askAI', args)
    return {
      success: true,
      data: {
        sql: 'SELECT * FROM mock_table',
        reasoning: 'Mock reasoning',
        title: 'Mock Analysis',
        summary: 'Mock summary',
      },
    }
  },
  fixSQL: async (...args: any[]): Promise<IPCResponse> => {
    console.log('Mock fixSQL', args)
    return { success: true, data: { sql: 'SELECT * FROM fixed', reasoning: 'Fixed' } }
  },
  analyzeContext: async (...args: any[]): Promise<IPCResponse> => {
    console.log('Mock analyzeContext', args)
    return { success: true, data: { relationships: [] } }
  },
  getAIConfig: async (): Promise<AIConfigResponse> => {
    return { success: true, data: { apiKey: 'mock-key' } }
  },
  setAIConfig: async (config: any): Promise<IPCResponse> => {
    console.log('Mock setAIConfig', config)
    return { success: true }
  },
  clearAIConfig: async (): Promise<IPCResponse> => {
    console.log('Mock clearAIConfig')
    return { success: true }
  },
  checkFilesConsistency: async (files: any[]): Promise<IPCResponse> => {
    console.log('Mock checkFilesConsistency', files)
    return { success: true, data: [] }
  },
  reIngestFile: async (
    filePath: string,
    tableName: string,
    sheetName?: string
  ): Promise<IPCResponse<ReloadResult>> => {
    console.log(`Mock reIngestFile: ${filePath} ${sheetName || ''}`)
    return { success: true, data: { lastModified: Date.now(), newColumns: [] } }
  },
  getDeviceId: async (): Promise<IPCResponse<string>> => {
    return { success: true, data: 'mock-device-id' }
  },
  secureSet: async (key: string, value: string): Promise<IPCResponse<boolean>> => {
    console.log(`Mock secureSet: ${key}=${value}`)
    return { success: true, data: true }
  },
  secureGet: async (key: string): Promise<IPCResponse<string | null>> => {
    console.log(`Mock secureGet: ${key}`)
    return { success: true, data: 'mock-value' }
  },
  exportPDF: async (data: any): Promise<IPCResponse> => {
    console.log(`Mock exportPDF: ${data}`)
    return { success: true }
  },
  exportReport: async (payload: any): Promise<IPCResponse> => {
    console.log('Mock exportReport', payload)
    return { success: true }
  },
  exportWebReport: async (widgets: any[], config: any): Promise<IPCResponse> => {
    console.log('Mock exportWebReport', widgets)
    return { success: true }
  },
  resetDB: async (): Promise<IPCResponse> => {
    console.log('Mock resetDB')
    return { success: true }
  },
  resetApp: async (): Promise<IPCResponse> => {
    console.log('Mock resetApp')
    return { success: true }
  },
  saveImage: async (dataUrl: string, name?: string): Promise<IPCResponse> => {
    console.log('Mock saveImage')
    return { success: true }
  },
  saveFile: async (content: string, extension: string, name: string): Promise<IPCResponse<boolean>> => {
    console.log('Mock saveFile')
    return { success: true, data: true }
  },
  openExternal: async (url: string): Promise<IPCResponse> => {
    console.log('Mock openExternal', url)
    return { success: true }
  },
  getUserInfo: async (): Promise<IPCResponse<{ username: string }>> => {
    return { success: true, data: { username: 'MockUser' } }
  },
  getPathForFile: (file: File) => file.name, // Mock
  windowControl: (
    action: 'enter-fullscreen' | 'exit-fullscreen' | 'toggle-maximize'
  ) => {
    console.log('Mock windowControl', action)
  },
  onWindowStateChanged: (callback: any) => () => {},
  platform: 'darwin', // Mock platform
  version: { electron: 'mock', chrome: 'mock', node: 'mock' } as NodeJS.ProcessVersions, // Mock versions
}

function getIpc() {
  // 在 Electron 环境中，window.electronAPI 会被注入
  if (window.electronAPI) {
    return window.electronAPI
  } else if (import.meta.env.DEV) {
    // 在开发模式下，如果不在 Electron 环境，则使用 mockIPC
    console.warn(
      'Running in non-Electron environment or electronAPI not yet available. Using mock IPC.'
    )
    return mockIPC
  } else {
    // 在生产环境下，如果 electronAPI 不可用，则抛出错误
    throw new Error('Electron API is not available.')
  }
}

// 文件解析 Hook
export const useParseFile = () => {
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

// SQL 执行 Hook
export const useRunSQL = () => {
  return useMutation({
    mutationFn: async (sql: string) => {
      const response = await getIpc().runSQL(sql)
      if (!response.success) {
        throw new Error(response.error || 'Failed to execute SQL')
      }
      return response.data
    },
  })
}

// 获取数据库 Schema Hook
export const useGetSchema = (tableName?: string) => {
  return useQuery({
    queryKey: ['schema', tableName],
    queryFn: async () => {
      const response = await getIpc().getSchema(tableName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to get schema')
      }
      return response.data
    },
    enabled: !!tableName,
  })
}

// AI 生成 SQL Hook
export const useGenerateSQL = () => {
  return useMutation({
    mutationFn: async ({ prompt, schema }: { prompt: string; schema: any }) => {
      const response = await getIpc().generateSQL(prompt, schema)
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate SQL')
      }
      return response.data
    },
  })
}

// 导出 PDF Hook
export const useExportPDF = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await getIpc().exportPDF(data)
      if (!response.success) {
        throw new Error(response.error || 'Failed to export PDF')
      }
      return response.data
    },
  })
}

// AI 配置 Hook
export const useAIConfig = () => {
  return useQuery({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const response = await getIpc().getAIConfig()
      if (!response.success) {
        throw new Error(response.error || 'Failed to get AI config')
      }
      return response.data
    },
  })
}

export const useSetAIConfig = () => {
  return useMutation({
    mutationFn: async (config: any) => {
      const response = await getIpc().setAIConfig(config)
      if (!response.success) {
        throw new Error(response.error || 'Failed to set AI config')
      }
      return response.data
    },
  })
}

// 清理 AI 配置 Hook
export const useClearAIConfig = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await getIpc().clearAIConfig()
      if (!response.success) {
        throw new Error(response.error || 'Failed to clear AI config')
      }
      return response.data
    },
  })
}

// 关系推断 Hook
export const useContextAnalysis = () => {
  return useMutation({
    mutationFn: async (
      params: any[] | { schemas: any[]; language?: 'en' | 'zh' }
    ) => {
      const { schemas, language } = Array.isArray(params)
        ? { schemas: params, language: undefined }
        : params
      const response = await getIpc().analyzeContext(
        schemas,
        language
      )
      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze context')
      }
      return response.data
    },
  })
}

// SQL 修复 Hook
export const useFixSQL = () => {
  return useMutation({
    mutationFn: async ({
      sql,
      error,
      schemas,
    }: {
      sql: string
      error: string
      schemas: any[]
    }) => {
      const response = await getIpc().fixSQL(sql, error, schemas)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fix SQL')
      }
      return response.data
    },
  })
}

// 文件选择 Hook
export const useSelectFile = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await getIpc().selectFile()
      if (!response.success) {
        if (response.error === 'User cancelled') {
          return null
        }
        throw new Error(response.error || 'Failed to select file')
      }
      return response.data
    },
  })
}

export const useSelectFiles = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await getIpc().selectFiles()
      if (!response.success) {
        if (response.error === 'User cancelled') {
          return []
        }
        throw new Error(response.error || 'Failed to select files')
      }
      return response.data
    },
  })
}

// 获取平台信息 Hook
export const usePlatform = () => {
  return useQuery({
    queryKey: ['platform'],
    queryFn: async () => getIpc().platform,
    staleTime: Infinity,
  })
}

// 获取版本信息 Hook
export const useVersion = () => {
  return useQuery({
    queryKey: ['version'],
    queryFn: async () => getIpc().version,
    staleTime: Infinity,
  })
}

// 获取用户信息 Hook
export const useUserInfo = () => {
  return useQuery({
    queryKey: ['user-info'],
    queryFn: async () => {
      const response = await getIpc().getUserInfo()
      if (!response.success) {
        // Fallback or ignore error
        return { username: 'User' }
      }
      return response.data
    },
    staleTime: Infinity,
  })
}

// 检查文件一致性 Hook
export const useCheckFilesConsistency = () => {
  return useMutation({
    mutationFn: async (files: any[]) => {
      const response = await getIpc().checkFilesConsistency(files)
      if (!response.success) {
        throw new Error(response.error || 'Failed to check files consistency')
      }
      return response.data
    },
  })
}

// 重新摄取文件 Hook
export const useReIngestFile = () => {
  return useMutation({
    mutationFn: async ({
      filePath,
      tableName,
      sheetName,
    }: {
      filePath: string
      tableName: string
      sheetName?: string
    }) => {
      const response = await getIpc().reIngestFile(
        filePath,
        tableName,
        sheetName
      )
      if (!response.success) {
        throw new Error(response.error || 'Failed to re-ingest file')
      }
      return response.data as ReloadResult
    },
  })
}

// AI Web 导出 Hook
export const useExportWebReport = () => {
  return useMutation({
    mutationFn: async ({
      widgets,
      config,
    }: {
      widgets: any[]
      config: any
    }) => {
      const response = await getIpc().exportWebReport(widgets, config)
      if (!response.success) {
        if (response.error === 'Cancelled') return
        throw new Error(response.error || 'Failed to export web report')
      }
      return response.data
    },
  })
}