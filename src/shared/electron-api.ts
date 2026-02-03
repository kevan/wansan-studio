import {
  AIConfig,
  AppConfig,
  ColumnSchema,
  DomainRule,
  ReloadResult,
  TableSchema,
} from './types'
import { InsightGenerationContext } from './types/dashboard'
import {
  AIConfigResponse,
  AnalyzeContextResponse,
  AskAIResponse,
  ExportExcelPayload,
  GetSchemaResponse,
  IPCResponse,
  ParseFileResponse,
  RunSQLResponse,
} from './api-types'
import { FilterParam } from './schemas/analysis'
import { TokenBudgetConfig } from './types/token-audit'

export interface IngestPreCheckParams {
  filePath: string
  targetTableName: string
  sourceTableName?: string // [NEW] If data is already in a temp table (DB sync)
  sheetName?: string
  uniqueKeys?: string[]
  columnMapping: Record<string, string | null>
  tempFilePath?: string // Cached CSV path
  readOptions?: Record<string, any>
}

export interface IngestPreCheckResponse {
  totalRows: number
  duplicateRows: number
  columnMatch: {
    matched: string[]
    missing: string[]
    extra: string[]
  }
}

export interface AppendDataParams {
  filePath: string
  targetTableName: string
  sourceTableName?: string // [NEW]
  sheetName?: string
  uniqueKeys?: string[]
  strategy: 'ignore' | 'replace' | 'update'
  columnMapping: Record<string, string | null>
  tempFilePath?: string // Cached CSV path
  limitRows?: number // Max rows allowed
  readOptions?: Record<string, any>
}

export interface CreateTableParams {
  filePath: string
  tableName: string // Target Table Name
  sourceTableName?: string // [NEW] If data is already in a temp table
  sheetName?: string
  columns: Array<{ name: string; type: string; isIgnored?: boolean }> // User-confirmed types and filters
  tempFilePath?: string // Cached CSV path
  limitRows?: number // Max rows allowed
  readOptions?: Record<string, any> // Options used to read the file
}

export interface ValidateColumnTypesParams {
  filePath: string
  tempFilePath?: string
  sourceTableName?: string // [NEW]
  columns: Array<{ name: string; type: string }>
  readOptions?: Record<string, any>
}

export interface ElectronAPI {
  // Generic invoke (keep for flexibility, but usage should be minimized)
  invoke: (channel: string, ...args: unknown[]) => Promise<IPCResponse>

  // File Operations
  selectFile: () => Promise<IPCResponse<string>>
  selectFiles: () => Promise<IPCResponse<{ path: string; size: number }[]>>
  selectDirectory: () => Promise<IPCResponse<string>>
  parseFile: (filePath: string) => Promise<ParseFileResponse>
  inspectFile: (
    filePath: string
  ) => Promise<
    IPCResponse<
      Array<{
        sourceName: string
        previewHeaders: string[]
        readOptions?: Record<string, any>
      }>
    >
  > // [NEW] Stage 1
  prepareFile: (
    filePath: string,
    sourceName: string,
    readOptions?: Record<string, any>
  ) => Promise<
    IPCResponse<{
      tempFilePath: string
      rowCount: number
      columns: ColumnSchema[]
      preview: any[]
    }>
  > // [NEW] Stage 2
  validateColumnTypes: (params: ValidateColumnTypesParams) => Promise<
    IPCResponse<{
      valid: boolean
      error?: string
      errorDetail?: { column: string; value: string; type: string }
    }>
  >
  reIngestFile: (
    fileId: string,
    filePath: string,
    tableName: string,
    sheetName?: string,
    columns?: ColumnSchema[], // Add this
    readOptions?: Record<string, any> // Add this
  ) => Promise<IPCResponse<ReloadResult>>
  ingestPreCheck: (
    params: IngestPreCheckParams
  ) => Promise<IPCResponse<IngestPreCheckResponse>>
  appendData: (
    params: AppendDataParams
  ) => Promise<IPCResponse<{ rowCount: number }>>
  createTableFromSource: (
    params: CreateTableParams
  ) => Promise<IPCResponse<{ rowCount: number; columns: ColumnSchema[] }>>
  cleanupIngestion: (
    tempTableNames: string[],
    tempFilePaths?: string[]
  ) => Promise<IPCResponse>
  cleanupAllStaging: () => Promise<IPCResponse>
  saveImage: (dataUrl: string, name?: string) => Promise<IPCResponse>
  saveFile: (
    content: string,
    extension: string,
    name: string
  ) => Promise<IPCResponse<string>>
  getPathForFile: (file: File) => string

  // Database Connectors
  testDBConnection: (
    config: import('./types').DBConnectionConfig,
    password?: string
  ) => Promise<IPCResponse<boolean>>
  listDBTables: (
    config: import('./types').DBConnectionConfig
  ) => Promise<IPCResponse<Array<{ name: string; schema?: string }>>>
  syncDBTable: (
    config: import('./types').DBConnectionConfig,
    tableName: string
  ) => Promise<
    IPCResponse<{
      rowCount: number
      columns: Array<{ name: string; type: string; nullable: boolean }>
    }>
  >

  // Database Operations
  runSQL: (sql: string) => Promise<RunSQLResponse>
  getUniqueTableName: (
    name: string,
    sheetName?: string
  ) => Promise<IPCResponse<string>>
  getSchema: (tableName?: string) => Promise<GetSchemaResponse>
  deleteTable: (tableName?: string) => Promise<IPCResponse>
  resetDB: () => Promise<IPCResponse>
  resetApp: () => Promise<IPCResponse>

  // AI & Analysis
  generateSQL: (
    prompt: string,
    schema: TableSchema[]
  ) => Promise<IPCResponse<string>>
  askAI: (
    userQuery: string,
    schemas: TableSchema[],
    context?: { lastSql: string; lastQuery: string },
    language?: 'en' | 'zh',
    domainRules?: DomainRule[],
    suggestionCount?: number
  ) => Promise<AskAIResponse>
  fixSQL: (
    originalSql: string,
    error: string,
    schemas: TableSchema[],
    domainRules?: DomainRule[]
  ) => Promise<
    IPCResponse<{
      sql: string
      reasoning: string
      is_template?: boolean
      missing_params?: FilterParam[]
    }>
  >
  analyzeContext: (
    schemas: TableSchema[],
    language?: 'en' | 'zh'
  ) => Promise<AnalyzeContextResponse>
  analyzeSemantics: (
    tableName: string,
    columns: ColumnSchema[],
    language?: 'en' | 'zh'
  ) => Promise<IPCResponse<Record<string, import('./types').ColumnSemantic>>>
  generateMetricExpression: (options: {
    input: string
    columns: Array<{ name: string; type: string }>
    mode: 'generate' | 'refine'
  }) => Promise<IPCResponse<string>>
  generateInsight: (
    context: InsightGenerationContext
  ) => Promise<IPCResponse<string>>
  aiPreviewExtract: (
    tableName: string,
    columnName: string,
    sampleData: any[],
    prompt: string
  ) => Promise<IPCResponse<{ results: string[]; estimatedCost: number }>>
  aiBatchExtract: (
    tableName: string,
    columnName: string,
    targetColumnName: string,
    prompt: string
  ) => Promise<IPCResponse<{ jobId: string }>>

  // Token Audit
  getTokenConfig: () => Promise<IPCResponse<TokenBudgetConfig>>
  setTokenConfig: (config: Partial<TokenBudgetConfig>) => Promise<IPCResponse>
  getTokenUsage: () => Promise<IPCResponse<{ 
    dailyUsageUSD: number,
    inputTokens: number,
    outputTokens: number,
    totalUsage: { usd: number, input: number, output: number }
  }>>

  // AI Config
  getAIConfig: () => Promise<AIConfigResponse>
  setAIConfig: (config: AIConfig) => Promise<IPCResponse>
  clearAIConfig: () => Promise<IPCResponse>
  verifyAIConnection: (config?: AIConfig) => Promise<IPCResponse>

  // Export
  exportPDF: (data: unknown) => Promise<IPCResponse>
  exportReport: (payload: unknown) => Promise<IPCResponse>
  exportWebReport: (
    widgets: unknown[],
    config: unknown,
    fullSnapshot?: unknown
  ) => Promise<IPCResponse>
  exportExcel: (payload: ExportExcelPayload) => Promise<IPCResponse<string>>

  // System / Misc
  getDeviceId: () => Promise<IPCResponse<string>>
  getUserInfo: () => Promise<IPCResponse<{ username: string }>>
  getPath: (name: string) => Promise<IPCResponse<string>>
  getAppVersion: () => Promise<IPCResponse<string>>
  getMainLogs: () => Promise<IPCResponse<any[]>>
  secureSet: (key: string, value: string) => Promise<IPCResponse<boolean>>
  secureGet: (key: string) => Promise<IPCResponse<string | null>>
  validateLicense: (key: string) => Promise<IPCResponse<boolean>>
  openExternal: (url: string) => Promise<IPCResponse>
  showItemInFolder: (path: string) => Promise<IPCResponse>
  setLanguage: (lang: 'en' | 'zh') => Promise<IPCResponse>

  // Environment
  platform: string
  version: NodeJS.ProcessVersions

  // Window Control
  windowControl: (
    action: 'enter-fullscreen' | 'exit-fullscreen' | 'toggle-maximize'
  ) => void
  onWindowStateChanged: (
    callback: (state: { isFullScreen: boolean }) => void
  ) => () => void
  onFileProgress: (
    callback: (data: { fileId: string; progress: number }) => void
  ) => () => void
  onParseProgress: (
    callback: (data: {
      filePath: string
      count?: number
      isPercentage?: boolean
      progress?: number
    }) => void
  ) => () => void
  onCommandCloseProject: (callback: () => void) => () => void
  onRemoteConfig: (callback: (config: AppConfig) => void) => () => void
}
