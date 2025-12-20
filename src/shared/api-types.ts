import { TableSchema, RelationSuggestion, ReloadResult } from './types'

export interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export type RunSQLResponse = IPCResponse<{
  data: any[]
  columnTypes: Record<string, string>
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

export type AIConfigResponse = IPCResponse<{
  apiKey?: string
  baseURL?: string
  model?: string
}>

// ... add other specific response types as needed
