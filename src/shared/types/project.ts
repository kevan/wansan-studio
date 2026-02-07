import { Message } from './chat'
import { ReportWidget, ReportData } from './dashboard'
import { FileNode, DomainRule, SmartMetric, TableRelation } from '../types'

export interface Relation {
  id: string
  fileAId: string
  columnA: string
  fileBId: string
  columnB: string
  autoDetected?: boolean
}

export type ViewMode = 'chat' | 'schema' | 'preview'

export interface Session {
  id: string
  title: string
  createdAt: number
  lastModified: number
  messages: Message[]
  replyToId?: string
  inputDraft?: string
  dashboard: {
    widgets: ReportWidget[]
    layoutMode: 'a4' | 'screen' | 'report'
    pageCount: number
    zoom: number
  }
}

export interface ProjectMeta {
  id: string
  name: string
  version: string
  created: number
}

export interface ProjectData {
  meta: ProjectMeta
  files: FileNode[]
  sessions: Session[]
  activeSessionId: string
  activeView: ViewMode
  appMode?: 'analysis' | 'data' // [NEW] v1.7
  activeFileId: string | null
  widgetRegistry: Record<string, ReportData>
  smartMetrics?: SmartMetric[]
  relations?: TableRelation[]
  domainRules?: DomainRule[]
  suggestedPrompts?: string[]
}
