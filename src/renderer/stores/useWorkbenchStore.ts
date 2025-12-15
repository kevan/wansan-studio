import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Layout } from 'react-grid-layout'
import { createBigIntStorage } from '@shared/serialization.ts'
import {
  GRID_ROW_HEIGHT,
  PAGE_GAP_PX,
  PAGE_HEIGHT_PX,
  ROWS_PER_PAGE,
} from '@/components/dashboard-v3/page-layer'
import type { AIAnalysisResult } from '@shared/types'

export type CanvasLayout = 'a4' | 'screen'
export type Language = 'en' | 'zh'

const FOOTER_HEIGHT_PX = 80

const getDefaultLanguage = (): Language => {
  if (typeof navigator !== 'undefined') {
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return 'en'
}

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
  timestamp?: number
}

export interface ReportWidget {
  id: string
  sourceMessageId: string
  reportData: ReportData
  layout: Layout
  pageIndex: number // 0-based index for A4 pagination
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
  editingReportId: string | null
  language: Language
  pinReport: (
    messageId: string,
    reportData: ReportData,
    timestamp?: number
  ) => void
  removeReport: (reportId: string) => void
  updateReportTitle: (reportId: string, newTitle: string) => void
  updateReportConfig: (
    id: string,
    updates: Partial<AIAnalysisResult['visualization']>
  ) => void
  updateLayout: (layouts: Layout[]) => void
  moveWidgetToPage: (reportId: string, targetPageIndex: number) => void
  setLayoutScenario: (scenario: LayoutScenario) => void
  setCanvasConfig: (updates: Partial<WorkbenchState['canvasConfig']>) => void
  setPageCount: (count: number) => void
  incrementPageCount: () => void
  setEditingReportId: (id: string | null) => void
  setLanguage: (lang: Language) => void
  reset: () => void
}

let workbenchRehydrateSet: ((partial: Partial<WorkbenchState>) => void) | null =
  null

const initialWorkbenchState: Pick<
  WorkbenchState,
  | 'pinnedReports'
  | 'layoutScenario'
  | 'canvasConfig'
  | 'pageCount'
  | 'editingReportId'
  | 'language'
> = {
  pinnedReports: [],
  layoutScenario: 'default',
  canvasConfig: {
    layout: 'a4',
    zoom: 80,
    title: 'Untitled Analysis',
  },
  pageCount: 1,
  editingReportId: null,
  language: getDefaultLanguage(),
}

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    set => {
      workbenchRehydrateSet = set

      return {
        ...initialWorkbenchState,
        setLayoutScenario: scenario => set({ layoutScenario: scenario }),
        setCanvasConfig: updates =>
          set(state => ({
            canvasConfig: { ...state.canvasConfig, ...updates },
            pageCount:
              updates.layout === 'a4' && state.canvasConfig.layout !== 'a4'
                ? (() => {
                    const maxPageIndex = state.pinnedReports.reduce(
                      (max, item) => Math.max(max, item.pageIndex || 0),
                      0
                    )
                    return Math.max(state.pageCount, maxPageIndex + 1)
                  })()
                : state.pageCount,
          })),
        setPageCount: count => set({ pageCount: Math.max(1, count) }),
        incrementPageCount: () =>
          set(state => ({ pageCount: state.pageCount + 1 })),
        setLanguage: lang => set({ language: lang }),
        pinReport: (messageId, reportData, timestamp) =>
          set(state => {
            // Check if already pinned to avoid duplicates for the same message
            if (
              state.pinnedReports.some(r => r.sourceMessageId === messageId)
            ) {
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
            // Ensure height doesn't exceed the safe content area of a single page
            const SAFE_ROWS =
              ROWS_PER_PAGE - Math.ceil(FOOTER_HEIGHT_PX / GRID_ROW_HEIGHT)
            h = Math.min(Math.max(1, h), SAFE_ROWS)

            // Find insertion point
            let targetPageIndex = 0
            let targetY = 0

            if (state.pinnedReports.length > 0) {
              // Find the report with the highest pageIndex, then highest y
              const lastReport = [...state.pinnedReports].sort((a, b) => {
                const pageDiff = (b.pageIndex || 0) - (a.pageIndex || 0)
                if (pageDiff !== 0) return pageDiff
                return (
                  (b.layout.y ?? 0) +
                  (b.layout.h ?? 0) -
                  ((a.layout.y ?? 0) + (a.layout.h ?? 0))
                )
              })[0]

              if (lastReport) {
                targetPageIndex = lastReport.pageIndex || 0
                targetY = (lastReport.layout.y ?? 0) + (lastReport.layout.h ?? 0)
              }
            }

            if (targetY + h > SAFE_ROWS) {
              targetPageIndex++
              targetY = 0
            }

            const newPageCount = Math.max(state.pageCount, targetPageIndex + 1)

            return {
              pinnedReports: [
                ...state.pinnedReports,
                {
                  id,
                  sourceMessageId: messageId,
                  reportData: {
                    ...reportData,
                    timestamp: timestamp ?? reportData.timestamp,
                  },
                  layout: {
                    i: id,
                    x: 0,
                    y: targetY,
                    w,
                    h,
                  },
                  pageIndex: targetPageIndex,
                },
              ],
              pageCount: newPageCount,
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
        updateReportConfig: (id, updates) =>
          set(state => ({
            pinnedReports: state.pinnedReports.map(report => {
              if (report.id !== id) return report
              const nextVizConfig =
                updates.config !== undefined
                  ? { ...report.reportData.vizConfig, ...updates.config }
                  : report.reportData.vizConfig

              return {
                ...report,
                reportData: {
                  ...report.reportData,
                  chartType: updates.type ?? report.reportData.chartType,
                  vizConfig: nextVizConfig,
                },
              }
            }),
          })),
        setEditingReportId: id => set({ editingReportId: id }),
        updateLayout: layouts =>
          set(state => {
            const layoutMap = new Map(layouts.map(l => [l.i, l]))
            // Note: This update assumes layouts are from a specific page grid
            // and does NOT change pageIndex. Cross-page moves happen via moveWidgetToPage.
            const nextPinnedReports = state.pinnedReports.map(r => {
              const newLayout = layoutMap.get(r.id)
              if (newLayout) {
                return {
                  ...r,
                  layout: { ...r.layout, ...newLayout },
                }
              }
              return r
            })

            // Recalculate page count based on max pageIndex present
            const maxPageIndex = nextPinnedReports.reduce(
              (max, r) => Math.max(max, r.pageIndex || 0),
              0
            )

            return {
              pinnedReports: nextPinnedReports,
              pageCount: Math.max(state.pageCount, maxPageIndex + 1),
            }
          }),
        moveWidgetToPage: (reportId, targetPageIndex) =>
          set(state => {
            const report = state.pinnedReports.find(r => r.id === reportId)
            if (!report) return state

            // Basic collision avoidance: put at bottom of target page
            // (A smarter implementation would try to keep x/y if possible)
            const reportsOnTargetPage = state.pinnedReports.filter(
              r => r.pageIndex === targetPageIndex && r.id !== reportId
            )
            const maxY = reportsOnTargetPage.reduce(
              (max, r) => Math.max(max, (r.layout.y ?? 0) + (r.layout.h ?? 0)),
              0
            )

            return {
              pinnedReports: state.pinnedReports.map(r =>
                r.id === reportId
                  ? {
                      ...r,
                      pageIndex: targetPageIndex,
                      layout: { ...r.layout, y: maxY },
                    }
                  : r
              ),
              pageCount: Math.max(state.pageCount, targetPageIndex + 1),
            }
          }),
        removeReport: reportId =>
          set(state => ({
            pinnedReports: state.pinnedReports.filter(r => r.id !== reportId),
          })),
        reset: () => set({ ...initialWorkbenchState }),
      }
    },
    {
      name: 'wansan-workbench',
      storage: createBigIntStorage(),
      partialize: state => ({
        pinnedReports: state.pinnedReports,
        canvasConfig: state.canvasConfig,
        pageCount: state.pageCount,
        language: state.language,
      }),
      onRehydrateStorage: () => state => {
        if (!state) return

        // Migration: Convert old global-Y coordinates to PageIndex + Local-Y
        const migratedReports = state.pinnedReports.map(report => {
          if (report.pageIndex === undefined) {
            // Heuristic migration
            const globalY = report.layout.y as number
            const pageIndex = Math.floor(globalY / ROWS_PER_PAGE)
            const localY = globalY % ROWS_PER_PAGE
            return {
              ...report,
              pageIndex,
              layout: { ...report.layout, y: localY },
              reportData: {
                ...report.reportData,
                timestamp: report.reportData.timestamp
                  ? typeof report.reportData.timestamp === 'number'
                    ? report.reportData.timestamp
                    : new Date(report.reportData.timestamp).getTime()
                  : undefined,
              },
            }
          }
          return {
            ...report,
            reportData: {
              ...report.reportData,
              timestamp: report.reportData.timestamp
                ? typeof report.reportData.timestamp === 'number'
                  ? report.reportData.timestamp
                  : new Date(report.reportData.timestamp).getTime()
                : undefined,
            },
          }
        })

        workbenchRehydrateSet?.({
          pinnedReports: migratedReports,
          language: state.language,
          pageCount: Math.max(
            state.pageCount,
            ...migratedReports.map(r => (r.pageIndex || 0) + 1)
          ),
        })
      },
    }
  )
)
