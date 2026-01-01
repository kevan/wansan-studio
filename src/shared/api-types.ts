import {
  TableSchema,
  RelationSuggestion,
  ReloadResult,
  AIConfig,
} from './types'

export interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export type RunSQLResponse = IPCResponse<{
  data: any[]
  columnFields: Array<{ name: string; type: string }>
}>

export type ParseFileResponse = IPCResponse<
  Array<{
    tableName: string
    schema: TableSchema
    rowCount: number
    preview?: any[]
    sheetName?: string
  }>
>

export type AIConfigResponse = IPCResponse<AIConfig>

// ... add other specific response types as needed
