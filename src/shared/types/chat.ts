import { ReportData } from './dashboard'

export interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  hiddenPrompt?: string // [NEW] Sent to AI (overrides content if present)
  timestamp: number
  status?: 'thinking' | 'planning' | 'executing' | 'error'
  error?: string
  planSql?: string
  planReasoning?: string
  contextRef?: {
    query: string
    sqlSummary: string
  }
  originalQuery?: string
  metadata?: {
    latency?: number
  }
  widgetId?: string
  reportData?: ReportData
}
