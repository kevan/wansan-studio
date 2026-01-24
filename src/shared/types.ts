import type { ChartType, InsightResult, ReportData, ReportWidget } from './types/dashboard'
import type { FilterParam } from './schemas/analysis'

export type { ChartType, InsightResult, ReportData, ReportWidget }

export type ColumnType =
  | 'VARCHAR'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'TIME'
  | 'INTEGER'
  | 'BIGINT'
  | 'TIMESTAMP'

export interface ColumnSemantic {
  /**
   * User-friendly aliases or synonyms
   * e.g. ["营收", "收入", "Sales Revenue"] for column "amt"
   */
  aliases?: string[]

  /**
   * High-level business type hint for visualization
   * e.g. "Currency", "City", "User_ID", "Category"
   */
  businessType?: string

  /**
   * Description of the column's business logic
   */
  description?: string

  /**
   * Whether this column is visible to the AI Context.
   * If false, it is EXCLUDED from the prompt sent to LLM.
   * Default: true.
   */
  isVisibleToAI?: boolean
}

export interface ColumnSchema {
  name: string // Original column name (e.g., "销售额(万元)")
  safeName: string // Sanitized name for SQL (e.g., "销售额(万元)") - *DuckDB supports utf8, but quoting is mandatory*
  type: ColumnType // Inferred DuckDB type
  sampleValues: any[] // Top 3 non-null values for AI context
  nullable?: boolean // From UI state, indicates if column can have nulls

  isPrimaryKey?: boolean // Optional metadata when a column is a primary key

  userType?: ColumnType // User defined type override
  semantic?: ColumnSemantic // [NEW] Semantic metadata
}

export interface TableSchema {
  tableName: string // Normalized table name (e.g., "t_orders")
  description?: string // Original file name for AI context (e.g., "Sales 2023.xlsx")
  columns: ColumnSchema[]
  smartMetrics?: SmartMetric[] // Metrics to be displayed in the schema
  tempFilePath?: string // Path to temporary file (e.g. converted CSV) for cleanup
  sheetName?: string // Source sheet name for Excel files
  readOptions?: Record<string, any> // Options used to read the file (e.g. { encoding: 'GBK' })
}

export interface AIAnalysisContext {
  userQuery: string
  schemas: TableSchema[]
  relations: RelationSuggestion[]
  prevContext?: { lastSql: string; lastQuery: string }
  language?: 'en' | 'zh'
  domainRules?: DomainRule[]
  suggestionCount?: number
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

  // Visualization (Matching Prompt Structure)
  viz_type?: ChartType
  viz_config?: {
    x_axis?: string | null
    y_axis?: string | string[] | null
    series_name?: string | string[]
  }

  // v1.2 Smart Filters
  is_template?: boolean
  missing_params?: FilterParam[]
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

export interface MetricSuggestion {
  name: string
  sqlExpression: string
  description?: string
  tableName: string
  confidence?: number
  reason?: string
}

export interface ContextAnalysisResult {
  relationships: RelationSuggestion[]
  metrics?: MetricSuggestion[]
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

export interface SmartMetric {
  id: string // UUID
  name: string // Main name / identifier (e.g., "Profit Margin")
  safeName?: string // Technical identifier (reserved)
  alias?: string // User defined alias
  sqlExpression: string // SQL Fragment (e.g., "amount - products__cost")
  description?: string // Context for AI
  type?: ColumnType // Cached type (e.g., "DOUBLE")
}

export interface TableRelation {
  id: string
  targetFileId: string // Target Table ID
  sourceColumn: string // Local Column Name
  targetColumn: string // Remote Column Name
  joinType?: 'LEFT' | 'INNER' | 'FULL' // Default to LEFT
  autoDetected?: boolean
}

export interface FileNode {
  id: string
  name: string
  path: string
  tableName: string // DuckDB table name
  sheetName?: string // Excel Sheet Name
  status: SyncStatus
  progress?: number // 0-100
  size?: number
  columns: ColumnSchema[]
  rowCount?: number
  error?: string
  lastModified: number // Timestamp (ms) of file modification
  createdAt: number
  smartMetrics?: SmartMetric[] // Persisted metrics
  relations?: TableRelation[] // NEW: Stored per-file
  readOptions?: Record<string, any> // Options used to read the file (e.g. encoding)
}

export interface ReloadResult {
  lastModified: number
  newColumns: ColumnSchema[]
}

export interface AIConfig {
  apiKey?: string
  baseURL?: string
  model?: string
  provider?: string // [NEW] AI Provider name (e.g. "DeepSeek", "OpenAI", "Custom")
  isManaged?: boolean // [NEW] Indicates build-time injected config
  models?: string[] // [NEW] Supported models for the provider
}

export interface DomainRule {
  id: string
  content: string
  isEnabled: boolean
  createdAt: number
}

export interface DBConnectionConfig {
  id: string
  name: string // Display name, e.g. "Production Postgres"
  type: 'mysql' | 'postgres'
  host: string
  port: number
  user: string
  database: string
  // Note: password is stored in secure-storage with key: `db_pass_${id}`
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

export interface RemoteConfig {
  min_version?: string
  latest_version?: string
  download_url?: string
  beta_code?: string | string[]
  special_expiry?: string // 企业版有效期
  channel?: string
  announcement?: {
    id: string
    text: string | { [lang: string]: string }
    link?: string
    level?: 'info' | 'warning'
  } | null
  providers?: Record<string, any> // AIProviderConfig
}

// 组合类型：发送给前端的最终配置
export interface AppConfig extends RemoteConfig {
  isActivated?: boolean
  isSpecialChannel?: boolean
  isExpired?: boolean
  isOffline?: boolean
  betaCodes?: string[]
  managedAI?: {
    provider: string
    models: string[]
  }
}
