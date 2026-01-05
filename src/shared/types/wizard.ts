import { ColumnType } from '../types'

export type WizardStep = 'select' | 'preview' | 'finalize'
export type WizardMode = 'import' | 'append' | 'replace' | 'merge'

export interface ColumnConfig {
  name: string
  type: ColumnType
  isPrimaryKey: boolean
  validationStatus?: 'idle' | 'validating' | 'success' | 'error'
  validationMessage?: string
}

export interface IngestionTask {
  id: string
  sourceName: string // Sheet name or file name
  fileName: string
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
  status: 'pending' | 'processing' | 'completed' | 'error'
  error?: string
  readOptions?: Record<string, any>
}

export interface WizardState {
  isOpen: boolean
  step: WizardStep
  mode: WizardMode
  targetTableId?: string // Add this

  // Source Data
  selectedFiles: { path: string; name: string; size: number }[]

  // Tasks (One per sheet/file)
  tasks: IngestionTask[]
  currentTaskIndex: number
  tempTableNames: string[] // Track created temp tables

  // UI Helpers
  isProcessing: boolean
}
