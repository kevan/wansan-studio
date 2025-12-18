import { useMutation, useQuery } from '@tanstack/react-query'
import type { ReloadResult } from '../../shared/types'

// IPC 通信接口类型定义
interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// 模拟 IPC 调用（实际实现将在主进程完成后替换）
const mockIPC = {
  invoke: async (channel: string, ...args: any[]): Promise<IPCResponse> => {
    console.log(`IPC Mock: ${channel}`, args)
    return { success: true, data: null }
  },
  selectFile: async () => {
    return { success: true, data: 'mock/path/to/file.xlsx' }
  },
  selectFiles: async () => {
    return {
      success: true,
      data: [
        { path: 'mock/path/to/file1.xlsx', size: 1024 },
        { path: 'mock/path/to/file2.csv', size: 2048 },
      ],
    }
  },
  parseFile: async (filePath: string) => {
    console.log(`Mock parseFile: ${filePath}`)
    return {
      success: true,
      data: [{ tableName: 'mock_table', schema: { columns: [] }, rowCount: 0 }],
    }
  },
  // ...
  reIngestFile: async (
    filePath: string,
    tableName: string,
    sheetName?: string
  ) => {
    console.log(`Mock reIngestFile: ${filePath} ${sheetName || ''}`)
    return { success: true, data: { lastModified: Date.now(), newColumns: [] } }
  },
  getDeviceId: async () => {
    return { success: true, data: 'mock-device-id' }
  },
  secureSet: async (key: string, value: string) => {
    console.log(`Mock secureSet: ${key}=${value}`)
    return { success: true }
  },
  secureGet: async (key: string) => {
    console.log(`Mock secureGet: ${key}`)
    return { success: true, data: 'mock-value' }
  },
  exportPDF: async (data: any) => {
    console.log(`Mock exportPDF: ${data}`)
    return { success: true }
  },
  exportReport: async (payload: any) => {
    console.log('Mock exportReport', payload)
    return { success: true }
  },
  resetDB: async () => {
    console.log('Mock resetDB')
    return { success: true }
  },
  resetApp: async () => {
    console.log('Mock resetApp')
    return { success: true }
  },
  openExternal: async (url: string) => {
    console.log('Mock openExternal', url)
    return { success: true }
  },
  getUserInfo: async () => {
    return { success: true, data: { username: 'MockUser' } }
  },
  windowControl: (
    action: 'enter-fullscreen' | 'exit-fullscreen' | 'toggle-maximize'
  ) => {
    console.log('Mock windowControl', action)
  },
  platform: 'darwin', // Mock platform
  version: { electron: 'mock', chrome: 'mock', node: 'mock' }, // Mock versions
}

// 声明全局 electronAPI（将由主进程注入）
declare global {
  interface Window {
    electronAPI: {
      // Removed ? to match global.d.ts
      invoke: (channel: string, ...args: any[]) => Promise<IPCResponse>
      selectFile: () => Promise<IPCResponse<string>>
      selectFiles: () => Promise<IPCResponse<{ path: string; size: number }[]>>
      parseFile: (filePath: string) => Promise<IPCResponse<any[]>>
      runSQL: (sql: string) => Promise<IPCResponse>
      getSchema: (tableName?: string) => Promise<IPCResponse>
      deleteTable: (tableName?: string) => Promise<IPCResponse>
      generateSQL: (prompt: string, schema: any) => Promise<IPCResponse>
      askAI: (
        query: string,
        schemas: any[],
        relations: any[],
        context?: { lastSql: string; lastQuery: string },
        language?: 'en' | 'zh'
      ) => Promise<IPCResponse>
      fixSQL: (
        originalSql: string,
        error: string,
        schemas: any[]
      ) => Promise<IPCResponse>
      analyzeContext: (
        schemas: any[],
        language?: 'en' | 'zh'
      ) => Promise<IPCResponse>
      getAIConfig: () => Promise<IPCResponse>
      setAIConfig: (config: any) => Promise<IPCResponse>
      clearAIConfig: () => Promise<IPCResponse>
      checkFilesConsistency: (files: any[]) => Promise<IPCResponse>
      reIngestFile: (
        filePath: string,
        tableName: string,
        sheetName?: string
      ) => Promise<IPCResponse<ReloadResult>>
      getDeviceId: () => Promise<IPCResponse<string>>
      secureSet: (key: string, value: string) => Promise<IPCResponse<boolean>>
      secureGet: (key: string) => Promise<IPCResponse<string | null>>
      exportPDF: (data: any) => Promise<IPCResponse>
      exportReport: (payload: any) => Promise<IPCResponse>
      resetDB: () => Promise<IPCResponse>
      resetApp: () => Promise<IPCResponse>
      saveImage: (dataUrl: string, name?: string) => Promise<IPCResponse>
      saveFile: (
        content: string,
        extension: string,
        name: string
      ) => Promise<IPCResponse<boolean>>
      getUserInfo: () => Promise<IPCResponse<{ username: string }>>
      openExternal: (url: string) => Promise<IPCResponse>
      getPathForFile: (file: File) => string
      windowControl: (
        action: 'enter-fullscreen' | 'exit-fullscreen' | 'toggle-maximize'
      ) => void
      platform: string
      version: NodeJS.ProcessVersions
    }
  }
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
      const response = await getIpc().invoke('parse-file', filePath)
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
      const response = await getIpc().invoke('run-sql', sql)
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
      const response = await getIpc().invoke('get-schema', tableName)
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
      const response = await getIpc().invoke('generate-sql', prompt, schema)
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
      const response = await getIpc().invoke('export-pdf', data)
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
      const response = await getIpc().invoke('get-ai-config')
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
      const response = await getIpc().invoke('set-ai-config', config)
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
      const response = await getIpc().invoke('clear-ai-config')
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
      const response = await getIpc().invoke(
        'analyze-context',
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
      const response = await getIpc().invoke('ask-ai-fix', sql, error, schemas)
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
      const response = await getIpc().invoke('select-file')
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
      const response = await getIpc().invoke('select-files')
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
      const response = await getIpc().invoke('get-user-info')
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
      const response = await getIpc().invoke('check-files-consistency', files)
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
      const response = await getIpc().invoke(
        're-ingest-file',
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
