import { ColumnType } from '../types'

export type WizardStep = 'select' | 'preview' | 'target' | 'summary'
export type WizardMode = 'import' | 'append'

export interface ColumnConfig {
  name: string
  type: ColumnType
  isPrimaryKey: boolean
  validationStatus?: 'idle' | 'validating' | 'success' | 'error'
  validationMessage?: string
}

export interface IngestionTask {
  id: string;
  sourceName: string;      // Sheet name or filename
  fileName: string;        // Original filename;
  filePath: string;
  tableName: string;       // Proposed DuckDB table name (staging)
  finalTableName?: string;  // Permanent table name (t_...)
  columns: ColumnConfig[];
  previewData: any[];
  rowCount: number;
  
  // Configuration
  mode: WizardMode;
  targetTableId?: string;  // For append mode;
  conflictStrategy?: 'ignore' | 'replace';
  columnMapping?: Record<string, string | null>; // { targetCol: sourceCol }
  preCheckResult?: {
    totalRows: number;
    duplicateRows: number;
    columnMatch: {
      matched: string[];
      missing: string[];
      extra: string[];
    };
  };
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface WizardState {
  isOpen: boolean
  step: WizardStep
  mode: WizardMode
  targetTableId?: string // Add this

  // Source Data
  selectedFiles: { path: string; name: string; size: number }[]

  // Tasks (One per sheet/file)
  tasks: IngestionTask[];
  currentTaskIndex: number;
  tempTableNames: string[]; // Track created temp tables
  
  // UI Helpers
  isProcessing: boolean
}
