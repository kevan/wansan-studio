import type { Layout } from 'react-grid-layout'
import type { FilterParam } from '../schemas/analysis'

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'area'
  | 'table'
  | 'scatter'
  | 'radar'
  | 'combo'
  | 'kpi'
  | 'text'

export interface ReportData {
  title: string
  summary?: string
  content?: string // For Text Widget
  sql?: string
  reasoning?: string
  suggestions?: string[]
  chartType?: ChartType
  tableData?: Array<Record<string, unknown>>
  columnFields?: Array<{ name: string; type: string }>
  columns?: string[] // Legacy support
  columnTypes?: Record<string, string> // Legacy support
  vizConfig?: {
    x_axis?: string | null
    y_axis?: string | string[] | null
    series_name?: string | string[]
  }
  timestamp?: number
  is_template?: boolean
  missing_params?: FilterParam[]
  selected_params?: Record<string, string[]>
  /** AI Business Insight (Structured) */
  insight?: InsightResult
  /** Timestamp when insight was generated */
  insightTime?: number
}

export interface InsightResult {
  summary: string
  findings: Array<{
    id: string
    markdown: string
    sentiment?: 'positive' | 'negative' | 'neutral'
    relatedItems?: string[]
  }>
  recommendation?: string
}

export interface ReportWidget {
  id: string
  sourceMessageId: string
  widgetId: string
  layout: Layout
  pageIndex: number // 0-based index for A4 pagination
}
