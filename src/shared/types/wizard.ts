import { ColumnType } from '../types'

export type WizardStep = 'select' | 'preview' | 'finalize'
export type WizardMode = 'import' | 'append' | 'replace' | 'merge'

export interface ColumnConfig {
  name: string
  type: ColumnType
  isPrimaryKey: boolean
  isIgnored?: boolean // [NEW] Physical exclusion from import
  validationStatus?: 'idle' | 'validating' | 'success' | 'error'
  validationMessage?: string
}

export type IngestionStatus = 
  | 'pending' 
  | 'waiting_for_sync' // Selected but data not fetched
  | 'syncing' // [NEW] Fetching data...
  | 'ready' // [NEW] Data fetched, ready for preview
  | 'processing' // Final ingestion
  | 'completed' 
  | 'error'

export interface IngestionTask {
  id: string
  sourceName: string // Sheet name or file name
  fileName: string
  connectionId?: string // [NEW] For DB tasks
  originalTableName?: string // [NEW] Source table name
  dbSchema?: string // [NEW] Source database schema
  filePath: string
  tempFilePath?: string // Path to cached temp file (e.g. converted CSV)
  tableName: string // Temp table name in DB
  finalTableName?: string
  finalDisplayName?: string // User-editable name for the FileNode
  columns: ColumnConfig[]
  previewData: any[]
  rowCount: number

  // Configuration
  mode: WizardMode
  targetTableId?: string // For append mode;
  conflictStrategy?: 'ignore' | 'replace'
  columnMapping?: Record<string, string | null> // { targetCol: sourceCol }
  mergeKeys?: string[] // Target column names to use as match keys (WHERE clause) for Merge Mode
  preCheckResult?: {
    totalRows: number
    duplicateRows: number
    columnMatch: {
      matched: string[]
      missing: string[]
      extra: string[]
    }
  }
  status: IngestionStatus
  error?: string
  readOptions?: Record<string, any>
}

export interface WizardState {
  isOpen: boolean
  step: WizardStep
  mode: WizardMode
  targetTableId?: string
  // For file mode
  selectedFiles: { path: string; name: string; size: number }[]
  
  tasks: IngestionTask[]
  currentTaskIndex: number
  tempTableNames: string[] // Track created temp tables

  // UI Helpers
  isProcessing: boolean
  isDbSelectorOpen: boolean // [NEW] Control DB Selection Dialog
}