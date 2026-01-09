import { Message } from './chat'
import { ReportWidget, ReportData } from './dashboard'
import { FileNode, DomainRule } from '../types'

export interface Relation {
  id: string
  fileAId: string
  columnA: string
  fileBId: string
  columnB: string
  autoDetected?: boolean
}

export type ViewMode = 'chat' | 'schema'

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

export interface ProjectData {
  meta: {
    id: string
    name: string
    version: string
    created: number
  }
  files: FileNode[] // Shared Data Assets (Now includes relations)
  sessions: Session[] // Multi-Session Content
  activeSessionId: string
  activeView: ViewMode
  activeFileId: string | null
  widgetRegistry: Record<string, ReportData>
  domainRules?: DomainRule[] // Project-level domain rules
}
