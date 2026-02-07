import { DataSourceConfig, SmartMetric, TableRelation } from '../types'

export interface AssetManifest {
  id: string
  name: string
  tableName: string
  
  // [REFACTOR] New structured source
  source?: DataSourceConfig
  
  // Legacy fields (for backward compatibility during load)
  originalPath?: string
  sheetName?: string
  
  status?: string // SyncStatus
  rowCount?: number
  lastModified?: number
  createdAt?: number
  columns: Array<{
    name: string
    type: string
    safeName: string
    sampleValues?: any[]
    nullable?: boolean
    isKey?: boolean
    isPrimaryKey?: boolean
    alias?: string
    semantic?: any // ColumnSemantic
  }>
}

export interface ProjectManifest {
  meta: {
    id: string
    name: string
    version: '0.5.0'
    createdAt: number
    updatedAt: number
    engine: 'native'
  }
  assets: AssetManifest[]
  settings: {
    theme?: 'light' | 'dark'
  }
}

export interface TableSemantic {
  description?: string
  /** Column-level business metadata, keyed by original column name */
  columns: Record<string, any> // Using any here to avoid circular or complex import in manifest, will be cast to ColumnSemantic
  /** Metrics defined or suggested for this table */
  smartMetrics: SmartMetric[]
  /** Relationships where this table is the source */
  relations: TableRelation[]
}

export interface SemanticLayer {
  /** Keyed by File ID */
  tables: Record<string, TableSemantic>
  /** Global business rules/context (Domain Memory) */
  domainRules?: string[]
  /** Legacy fields for backward compatibility during migration */
  relations?: Record<string, TableRelation[]>
  smartMetrics?: Record<string, SmartMetric[]>
}

export interface ProjectLoadResult {
  path: string
  manifest: ProjectManifest
  semantic: SemanticLayer
  session: any
}

export interface ProjectSavePayload {
  manifest?: Partial<ProjectManifest>
  semantic?: Partial<SemanticLayer>
  session?: any
}
