import { create } from 'zustand'
import type { Layout } from 'react-grid-layout'
import { GRID_ROW_HEIGHT, PAGE_GAP_PX, PAGE_HEIGHT_PX } from '@/components/dashboard-v3/page-layer'

export type CanvasLayout = 'a4' | 'screen'

export interface ReportData {
  title: string
  subtitle?: string
  summary?: string
  insights?: string[]
  sql?: string
  reasoning?: string
  suggestions?: string[]
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'table' | 'scatter' | 'kpi'
  chartTitle?: string
  tableData?: Array<Record<string, any>>
  columns?: string[]
  vizConfig?: {
    x_axis?: string | null
    y_axis?: string | string[] | null
    series_name?: string
  }
}

export interface ReportWidget {
  id: string
  sourceMessageId: string
  reportData: ReportData
  layout: Layout
}

export type LayoutScenario = 'default' | 'print' | 'large' | 'ppt' | 'email'

interface WorkbenchState {
  pinnedReports: ReportWidget[]
  layoutScenario: LayoutScenario
  canvasConfig: {
    layout: CanvasLayout
    zoom: number
    title: string
  }
  pageCount: number
  pinReport: (messageId: string, reportData: ReportData) => void
  removeReport: (reportId: string) => void
  updateReportTitle: (reportId: string, newTitle: string) => void
  updateLayout: (layouts: Layout[]) => void
  setLayoutScenario: (scenario: LayoutScenario) => void
  setCanvasConfig: (updates: Partial<WorkbenchState['canvasConfig']>) => void
  setPageCount: (count: number) => void
  incrementPageCount: () => void
}

export const useWorkbenchStore = create<WorkbenchState>(set => ({
  pinnedReports: [],
  layoutScenario: 'default',
  canvasConfig: {
    layout: 'a4',
    zoom: 100,
    title: 'Untitled Analysis',
  },
  pageCount: 1,
  setLayoutScenario: scenario => set({ layoutScenario: scenario }),
  setCanvasConfig: updates =>
    set(state => ({
      canvasConfig: { ...state.canvasConfig, ...updates },
      pageCount:
        updates.layout === 'a4' && state.canvasConfig.layout !== 'a4'
          ? (() => {
              const maxGridY = state.pinnedReports.reduce((max, item) => {
                const y = Number.isFinite(item.layout?.y) ? (item.layout.y as number) : 0
                const h = Number.isFinite(item.layout?.h) ? (item.layout.h as number) : 0
                return Math.max(max, y + h)
              }, 0)
              const contentPx = maxGridY * GRID_ROW_HEIGHT
              const blockPx = PAGE_HEIGHT_PX + PAGE_GAP_PX
              const needed = blockPx > 0 ? Math.ceil(contentPx / blockPx) : 1
              return Math.max(state.pageCount, needed || 1)
            })()
          : state.pageCount,
    })),
  setPageCount: count => set({ pageCount: Math.max(1, count) }),
  incrementPageCount: () => set(state => ({ pageCount: state.pageCount + 1 })),
  pinReport: (messageId, reportData) =>
    set(state => {
      // Check if already pinned to avoid duplicates for the same message
      if (state.pinnedReports.some(r => r.sourceMessageId === messageId)) {
        return state
      }

      const id = crypto.randomUUID()
      const isBigNumberData = (data?: Array<Record<string, any>>) => {
        if (!data || data.length !== 1) return false
        const keys = Object.keys(data[0] || {})
        return keys.length <= 1
      }

      let w = 6
      let h = 10

      switch (reportData.chartType) {
        case 'table':
          if (isBigNumberData(reportData.tableData)) {
            w = 3
            h = 4
          } else {
            w = 12
            h = 12
          }
          break
        case 'pie':
          w = 4
          h = 8
          break
        case 'bar':
        case 'line':
        case 'area':
        case 'scatter':
          if ((reportData.tableData?.length || 0) > 20) {
            w = 12
            h = 12
          } else {
            w = 6
            h = 10
          }
          break
        case 'kpi':
          w = 3
          h = 6
          break
        default:
          w = 6
          h = 10
      }

      // Respect 12-column grid and keep positive dimensions
      w = Math.min(12, Math.max(1, w))
      h = Math.max(1, h)

      const maxY = state.pinnedReports.reduce(
        (max, item) => Math.max(max, (item.layout?.y ?? 0) + (item.layout?.h ?? 0)),
        0
      )

      return {
        pinnedReports: [
          ...state.pinnedReports,
          {
            id,
            sourceMessageId: messageId,
            reportData,
            layout: {
              i: id,
              x: 0,
              y: maxY, // Put at bottom just after last item
              w,
              h,
            },
          },
        ],
      }
    }),
  updateReportTitle: (reportId, newTitle) =>
    set(state => ({
      pinnedReports: state.pinnedReports.map(r =>
        r.id === reportId
          ? { ...r, reportData: { ...r.reportData, title: newTitle } }
          : r
      ),
    })),
  updateLayout: layouts =>
    set(state => {
      const layoutMap = new Map(layouts.map(l => [l.i, l]))
      return {
        pinnedReports: state.pinnedReports.map(r => {
          const newLayout = layoutMap.get(r.id)
          if (newLayout) {
            return {
              ...r,
              layout: { ...r.layout, ...newLayout },
            }
          }
          return r
        }),
      }
    }),
  removeReport: reportId =>
    set(state => ({
      pinnedReports: state.pinnedReports.filter(r => r.id !== reportId),
    })),
}))
