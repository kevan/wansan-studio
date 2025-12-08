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
  selectFile: async () => { return { success: true, data: 'mock/path/to/file.xlsx' } },
  selectFiles: async () => { return { success: true, data: ['mock/path/to/file1.xlsx', 'mock/path/to/file2.csv'] } },
  parseFile: async (filePath: string) => { console.log(`Mock parseFile: ${filePath}`); return { success: true, data: { tableName: 'mock_table', schema: { columns: [] }, rowCount: 0 } } },
  runSQL: async (sql: string) => { console.log(`Mock runSQL: ${sql}`); return { success: true, data: [] } },
  getSchema: async (tableName?: string) => { console.log(`Mock getSchema: ${tableName}`); return { success: true, data: { tableName: tableName || 'mock_table', columns: [] } } },
  generateSQL: async (prompt: string, schema: any) => { console.log(`Mock generateSQL: ${prompt}, Schema: ${JSON.stringify(schema)}`); return { success: true, data: { sql: 'SELECT 1', title: 'Mock Report', summary: 'Mock Summary', viz_type: 'table', viz_config: { x_axis: '', y_axis: '' }, reasoning: 'Mock Reason' } } },
  askAI: async (query: string, schemas: any[], relations: any[]) => { console.log(`Mock askAI: ${query}, Schemas: ${JSON.stringify(schemas)}, Relations: ${JSON.stringify(relations)}`); return { success: true, data: { sql: 'SELECT 1', title: 'Mock Report', summary: 'Mock Summary', viz_type: 'table', viz_config: { x_axis: '', y_axis: '' }, reasoning: 'Mock Reason' } } },
  inferRelationships: async (schemas: any[]) => { console.log(`Mock inferRelationships, Schemas: ${JSON.stringify(schemas)}`); return { success: true, data: [] } },
  getAIConfig: async () => { return { success: true, data: {} } },
  setAIConfig: async (config: any) => { console.log(`Mock setAIConfig: ${config}`); return { success: true } },
  clearAIConfig: async () => { console.log(`Mock clearAIConfig`); return { success: true } },
  checkFilesConsistency: async (files: any[]) => { console.log(`Mock checkFilesConsistency: ${files.length}`); return { success: true, data: [] } },
  reIngestFile: async (filePath: string, tableName: string) => { console.log(`Mock reIngestFile: ${filePath}`); return { success: true, data: { lastModified: Date.now(), newColumns: [] } } },
  exportPDF: async (data: any) => { console.log(`Mock exportPDF: ${data}`); return { success: true } },
  platform: 'darwin', // Mock platform
  version: { electron: 'mock', chrome: 'mock', node: 'mock' } // Mock versions
}

// 声明全局 electronAPI（将由主进程注入）
declare global {
  interface Window {
    electronAPI: { // Removed ? to match global.d.ts
      invoke: (channel: string, ...args: any[]) => Promise<IPCResponse>
      selectFile: () => Promise<IPCResponse<string>>
      selectFiles: () => Promise<IPCResponse<string[]>>
      parseFile: (filePath: string) => Promise<IPCResponse>
      runSQL: (sql: string) => Promise<IPCResponse>
      getSchema: (tableName?: string) => Promise<IPCResponse>
      generateSQL: (prompt: string, schema: any) => Promise<IPCResponse>
      askAI: (query: string, schemas: any[], relations: any[]) => Promise<IPCResponse>
      inferRelationships: (schemas: any[]) => Promise<IPCResponse>
      getAIConfig: () => Promise<IPCResponse>
      setAIConfig: (config: any) => Promise<IPCResponse>
      clearAIConfig: () => Promise<IPCResponse>
      checkFilesConsistency: (files: any[]) => Promise<IPCResponse>
      reIngestFile: (filePath: string, tableName: string) => Promise<IPCResponse<ReloadResult>>
      exportPDF: (data: any) => Promise<IPCResponse>
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
export const useInferRelationships = () => {
  return useMutation({
    mutationFn: async (schemas: any[]) => {
      const response = await getIpc().invoke('infer-relationships', schemas)
      if (!response.success) {
        throw new Error(response.error || 'Failed to infer relationships')
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
    mutationFn: async ({ filePath, tableName }: { filePath: string; tableName: string }) => {
      const response = await getIpc().invoke('re-ingest-file', filePath, tableName)
      if (!response.success) {
        throw new Error(response.error || 'Failed to re-ingest file')
      }
      return response.data as ReloadResult
    },
  })
}

