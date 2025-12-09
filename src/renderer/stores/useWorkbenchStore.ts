import { create } from 'zustand'

export interface ReportData {
  title: string
  subtitle?: string
  summary?: string
  insights?: string[]
  sql?: string
  reasoning?: string
  suggestions?: string[]
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'table'
  chartTitle?: string
  tableData?: Array<Record<string, any>>
  vizConfig?: {
    x_axis?: string | null
    y_axis?: string | null
    series_name?: string
  }
}

export interface ReportWidget {
  id: string
  sourceMessageId: string
  reportData: ReportData
  layout: {
    i: string
    x: number
    y: number
    w: number
    h: number
  }
}

interface WorkbenchState {
  pinnedReports: ReportWidget[]
  pinReport: (messageId: string, reportData: ReportData) => void
  removeReport: (reportId: string) => void
  updateReportTitle: (reportId: string, newTitle: string) => void
  updateLayout: (layouts: any[]) => void
}

export const useWorkbenchStore = create<WorkbenchState>(set => ({
  pinnedReports: [],
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
      let h = 5

      switch (reportData.chartType) {
        case 'table':
          if (isBigNumberData(reportData.tableData)) {
            w = 3
            h = 2
          } else {
            w = 6
            h = 6
          }
          break
        case 'pie':
          w = 4
          h = 4
          break
        case 'bar':
        case 'line':
        case 'area':
          if ((reportData.tableData?.length || 0) > 20) {
            w = 12
            h = 6
          } else {
            w = 6
            h = 5
          }
          break
        default:
          w = 6
          h = 5
      }

      // Respect 12-column grid and keep positive dimensions
      w = Math.min(12, Math.max(1, w))
      h = Math.max(1, h)

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
              y: Infinity, // Put at bottom
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
              layout: {
                ...r.layout,
                x: newLayout.x,
                y: newLayout.y,
                w: newLayout.w,
                h: newLayout.h,
              },
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
