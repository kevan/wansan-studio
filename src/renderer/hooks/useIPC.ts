import { useMutation, useQuery } from '@tanstack/react-query'

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
  }
}

// 声明全局 electronAPI（将由主进程注入）
declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: any[]) => Promise<IPCResponse>
    }
  }
}

const ipc = window.electronAPI || mockIPC

// 文件解析 Hook
export const useParseFile = () => {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const response = await ipc.invoke('parse-file', filePath)
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
      const response = await ipc.invoke('run-sql', sql)
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
      const response = await ipc.invoke('get-schema', tableName)
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
      const response = await ipc.invoke('generate-sql', prompt, schema)
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
      const response = await ipc.invoke('export-pdf', data)
      if (!response.success) {
        throw new Error(response.error || 'Failed to export PDF')
      }
      return response.data
    },
  })
}
