export type ColumnType =
  | 'VARCHAR'
  | 'DOUBLE'
  | 'BOOLEAN'
  | 'DATE'
  | 'INTEGER'
  | 'TIMESTAMP'

export interface ColumnSchema {
  name: string // Original column name (e.g., "销售额(万元)")
  safeName: string // Sanitized name for SQL (e.g., "销售额(万元)") - *DuckDB supports utf8, but quoting is mandatory*
  type: ColumnType // Inferred DuckDB type
  sampleValues: any[] // Top 3 non-null values for AI context
  nullable?: boolean // From UI state, indicates if column can have nulls
  isKey?: boolean // From UI state, indicates if column is a join key
  isPrimaryKey?: boolean // Optional metadata when a column is a primary key
  alias?: string // User defined alias for the column
  userType?: ColumnType // User defined type override
}

export interface TableSchema {
  tableName: string // Normalized table name (e.g., "t_orders")
  description?: string // Original file name for AI context (e.g., "Sales 2023.xlsx")
  columns: ColumnSchema[]
}

export interface AIAnalysisResult {
  status: 'success' | 'error'
  data?: any[] // Raw rows from DuckDB
  columns?: string[] // Column headers
  sql?: string // The Executed SQL

  // AI Context
  title?: string
  summary?: string
  reasoning?: string
  suggestions?: string[]
  error?: string

  // Visualization
  visualization?: {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'kpi' | 'area' | 'text'
    config: {
      x_axis?: string | null
      y_axis?: string | string[] | null
      series_name?: string
    }
  }

  // v1.2 Smart Filters
  is_template?: boolean
  missing_params?: Array<{
    placeholder: string
    label: string
    column: string
    table: string
    hint?: string
  }>
}

// [UPDATE] Add this new interface
export interface RelationSuggestion {
  sourceTable: string // e.g., "t_orders"
  sourceColumn: string // e.g., "product_id"
  targetTable: string // e.g., "t_products"
  targetColumn: string // e.g., "id"
  confidence: number // 0.0 to 1.0
  reason: string // Explanation for the UI (e.g. "Column names match")
}

export interface ContextAnalysisResult {
  relationships: RelationSuggestion[]
  suggestedPrompts: string[]
}

export type LoadingType = 'cleaning' | 'thinking' | 'crunching' | 'fixing'

export type SyncStatus =
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error'
  | 'out-of-sync'
  | 'missing'

export interface FileNode {
  id: string
  name: string
  path: string
  tableName: string // DuckDB table name
  sheetName?: string // Excel Sheet Name
  status: SyncStatus
  size?: number
  columns: ColumnSchema[]
  rowCount?: number
  error?: string
  lastModified: number // Timestamp (ms) of file modification
  createdAt: number
}

export interface ReloadResult {
  lastModified: number
  newColumns: ColumnSchema[]
}

export interface AIConfig {
  apiKey?: string
  baseURL?: string
  model?: string
}

// 选中节点类型
export type SelectedNodeType = 'file' | 'column' | 'relation' | null

// 选中节点信息
export interface SelectedNode {
  id: string
  type: SelectedNodeType
  fileId?: string // 如果是 column，关联的文件 ID
  columnName?: string // 如果是 column，列名
  relationId?: string // 如果是 relation，关联 ID
}