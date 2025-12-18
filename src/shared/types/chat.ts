import { ReportData } from './dashboard'

export interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
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
}
