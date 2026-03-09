import type {
  ProjectData,
  ViewMode,
} from '@shared/types/project'
import type {
  ProjectLoadResult,
  SemanticLayer,
} from '@shared/types/project-manifest'
import type {
  DataSourceConfig,
  FileNode,
  LocalFileSource,
  SyncStatus,
  DomainRule,
} from '@shared/types'
import type { Session } from '@shared/types/project'
import type { ReportData } from '@shared/types/dashboard'

export function shouldShowDataWorkspace(
  appMode: 'analysis' | 'data',
  activeView: ViewMode
) {
  return appMode === 'data' || activeView === 'schema' || activeView === 'preview'
}

export function buildProjectSemantic(
  state: Pick<ProjectData, 'files' | 'suggestedPrompts' | 'domainRules'>
): SemanticLayer {
  const tables: Record<string, any> = {}

  state.files.forEach(f => {
    tables[f.id] = {
      columns: f.columns.reduce((acc, col) => {
        if (col.semantic) acc[col.name] = col.semantic
        return acc
      }, {} as Record<string, any>),
      smartMetrics: f.smartMetrics || [],
      relations: f.relations || [],
    }
  })

  return {
    tables,
    suggestedPrompts: state.suggestedPrompts,
    domainRules: (state.domainRules || [])
      .filter(rule => rule.isEnabled)
      .map(rule => rule.content),
  }
}

function deserializeProjectRules(domainRules?: string[]): DomainRule[] {
  return (domainRules || []).map((content, index) => ({
    id: `project-rule-${index}`,
    content,
    isEnabled: true,
    createdAt: 0,
  }))
}

export function buildProjectDataFromLoadResult(
  data: ProjectLoadResult
): ProjectData {
  const files: FileNode[] = data.manifest.assets.map(asset => {
    const metrics = (asset as any).smartMetrics || []
    const relations = (asset as any).relations || []
    const now = Date.now()

    let source: DataSourceConfig
    if (asset.source) {
      source = asset.source
    } else {
      source = {
        type: 'local_file',
        path: asset.originalPath || '',
        subResource: asset.sheetName,
      } as LocalFileSource
    }

    return {
      id: asset.id,
      name: asset.name,
      tableName: asset.tableName,
      source,
      status: (asset.status || 'ready') as SyncStatus,
      progress: 100,
      size: 0,
      columns: asset.columns.map(c => ({
        name: c.name,
        safeName: c.safeName,
        type: c.type as any,
        sampleValues: c.sampleValues || [],
        nullable: c.nullable ?? true,
        isPrimaryKey: c.isPrimaryKey ?? false,
        semantic: (c as any).semantic,
      })),
      rowCount: asset.rowCount || 0,
      error: undefined,
      lastModified: asset.lastModified || now,
      createdAt: asset.createdAt || now,
      displayState: (asset as any).displayState,
      smartMetrics: metrics,
      relations,
    }
  })

  const sessionState = data.session || {}
  const sessions: Session[] = sessionState.sessions || []
  const widgetRegistry: Record<string, ReportData> =
    sessionState.widgetRegistry || {}
  const activeSessionId = sessionState.activeSessionId || ''
  const activeView = sessionState.activeView || 'chat'
  const activeFileId = sessionState.activeFileId || null

  return {
    meta: {
      id: data.manifest.meta.id,
      name: data.manifest.meta.name,
      version: '1.1.0',
      created: data.manifest.meta.createdAt,
    },
    files,
    sessions,
    activeSessionId,
    activeView,
    activeFileId,
    widgetRegistry,
    suggestedPrompts: data.semantic.suggestedPrompts || [],
    domainRules: deserializeProjectRules(data.semantic.domainRules),
    tableViews: data.manifest.tableViews || {},
  }
}

export type PersistentProjectSnapshot = Pick<
  ProjectData,
  | 'files'
  | 'sessions'
  | 'widgetRegistry'
  | 'activeSessionId'
  | 'activeView'
  | 'tableViews'
  | 'suggestedPrompts'
  | 'domainRules'
>

export function hasPersistentProjectChanges(
  state: PersistentProjectSnapshot,
  prevState: PersistentProjectSnapshot
) {
  return (
    state.files !== prevState.files ||
    state.sessions !== prevState.sessions ||
    state.widgetRegistry !== prevState.widgetRegistry ||
    state.activeSessionId !== prevState.activeSessionId ||
    state.activeView !== prevState.activeView ||
    state.tableViews !== prevState.tableViews ||
    state.suggestedPrompts !== prevState.suggestedPrompts ||
    state.domainRules !== prevState.domainRules
  )
}
