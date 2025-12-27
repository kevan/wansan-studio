import { SmartMetric, TableRelation } from '../types'

export interface ProjectManifest {
  meta: {
    id: string
    name: string
    version: '1.3.0'
    createdAt: number
    updatedAt: number
    engine: 'native'
  }
  assets: Array<{
    id: string
    name: string
    originalPath: string // Absolute path
    tableName: string
    columns: Array<{ name: string; type: string; safeName: string }>
  }>
  settings: {
    theme?: 'light' | 'dark'
  }
}

export interface SemanticLayer {
  relations: Record<string, TableRelation[]> // Keyed by Source File ID
  smartMetrics: Record<string, SmartMetric[]>
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
