import {
  AIConfig,
  TableSchema,
  AIAnalysisResult,
  ContextAnalysisResult,
} from './types'

export interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export type RunSQLResponse = IPCResponse<{
  data: Record<string, unknown>[]
  columnFields: Array<{ name: string; type: string }>
}>

export type ParseFileResponse = IPCResponse<
  Array<{
    tableName: string
    schema: TableSchema
    rowCount: number
    preview?: Record<string, unknown>[]
    sheetName?: string
  }>
>

export type AIConfigResponse = IPCResponse<AIConfig>

export type GetSchemaResponse = IPCResponse<{
  tables: TableSchema[]
}>

export type AskAIResponse = IPCResponse<AIAnalysisResult>

export type AnalyzeContextResponse = IPCResponse<ContextAnalysisResult>

export interface ExportSheetData {
  name: string
  data: Record<string, unknown>[]
  columns: Array<{ name: string; type: string }>
  insight?: string
  chartImage?: string // Base64 data URL
  chartWidth?: number
  chartHeight?: number
}

export interface ExportExcelPayload {
  filename: string
  sheets: ExportSheetData[]
}

