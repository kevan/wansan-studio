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
      let w = 6
      let h = 4

      // Determine default size based on viz type
      const isBigNumber =
        reportData.chartType === 'table' &&
        reportData.tableData &&
        reportData.tableData.length === 1
      const isTable = reportData.chartType === 'table' && !isBigNumber

      if (isBigNumber) {
        w = 3
        h = 2
      } else if (isTable) {
        w = 12
        h = 6
      }

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
