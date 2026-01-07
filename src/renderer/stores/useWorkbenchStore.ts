import { Language, LayoutScenario, useProjectStore } from './useProjectStore'
import { ReportData, ReportWidget } from '@shared/types/dashboard'
import type { Layout } from 'react-grid-layout'
import type { AIAnalysisResult } from '@shared/types'
import { useMemo } from 'react'
import {
  GRID_MARGIN_Y,
  GRID_ROW_HEIGHT,
  PAGE_HEIGHT_PX,
  ROWS_PER_PAGE,
} from '@/components/dashboard-v3/page-layer'
import { useSettingsStore } from './useSettingsStore'

// Re-exports for compatibility
export type { LayoutScenario, Language }
export type CanvasLayout = 'a4' | 'screen'
export type { ReportData, ReportWidget }

export interface DenormalizedReportWidget extends Omit<
  ReportWidget,
  'widgetId'
> {
  reportData: ReportData
}

const FOOTER_HEIGHT_PX = 70

interface WorkbenchState {
  pinnedReports: DenormalizedReportWidget[]
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
    timestamp?: number,
    widgetId?: string
  ) => void
  removeReport: (reportId: string) => void
  updateReportTitle: (reportId: string, newTitle: string) => void
  updateReportConfig: (
    reportId: string,
    updates: {
      type?: AIAnalysisResult['viz_type']
      config?: AIAnalysisResult['viz_config']
      insight?: string
    }
  ) => void
  updateLayout: (layouts: Layout[]) => void
  updateGlobalLayout: (layouts: Layout[]) => void
  moveWidgetToPage: (reportId: string, targetPageIndex: number) => void
  setLayoutScenario: (scenario: LayoutScenario) => void
  setCanvasConfig: (updates: Partial<WorkbenchState['canvasConfig']>) => void
  setPageCount: (count: number) => void
  incrementPageCount: () => void
  setEditingReportId: (id: string | null) => void
  reset: () => void
}

// Logic Helper
const getSessionState = () => {
  const projectState = useProjectStore.getState()
  const session = projectState.sessions.find(
    s => s.id === projectState.activeSessionId
  )
  return { projectState, session, dashboard: session?.dashboard }
}

const pinReport = (
  messageId: string,
  reportData: ReportData,
  timestamp?: number,
  widgetId?: string
) => {
  const { dashboard } = getSessionState()
  if (!dashboard) return

  // Check if already pinned
  if (dashboard.widgets.some(r => r.sourceMessageId === messageId)) {
    return
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

  w = Math.min(12, Math.max(1, w))
  const EFFECTIVE_ROW_HEIGHT = GRID_ROW_HEIGHT + GRID_MARGIN_Y
  const SAFE_ROWS = Math.floor(
    (PAGE_HEIGHT_PX - FOOTER_HEIGHT_PX) / EFFECTIVE_ROW_HEIGHT
  )
  h = Math.min(Math.max(1, h), SAFE_ROWS)

  let targetPageIndex = 0
  let targetX = 0
  let targetY = 0

  if (dashboard.widgets.length > 0) {
    // 1. Find the target page (last page with content)
    const maxPageIndex = Math.max(
      ...dashboard.widgets.map(w => w.pageIndex || 0)
    )
    targetPageIndex = maxPageIndex

    const pageWidgets = dashboard.widgets.filter(
      w => (w.pageIndex || 0) === maxPageIndex
    )

    if (pageWidgets.length > 0) {
      // Default strategy: Start a new row below everything
      const bottomY = pageWidgets.reduce(
        (max, w) => Math.max(max, (w.layout.y || 0) + (w.layout.h || 0)),
        0
      )
      targetY = bottomY
      targetX = 0

      // Optimized strategy: Try to append to the right of the "last" widget
      const sorted = [...pageWidgets].sort((a, b) => {
        const ay = a.layout.y || 0
        const by = b.layout.y || 0
        if (ay !== by) return ay - by
        return (a.layout.x || 0) - (b.layout.x || 0)
      })

      const last = sorted[sorted.length - 1]
      if (last) {
        const attemptX = (last.layout.x || 0) + (last.layout.w || 0)
        const attemptY = last.layout.y || 0

        // Check 1: Does it fit within the 12-column grid?
        if (attemptX + w <= 12) {
          // Check 2: Does it collide with any other widget?
          const hasCollision = pageWidgets.some(existing => {
            const ex = existing.layout.x || 0
            const ey = existing.layout.y || 0
            const ew = existing.layout.w || 0
            const eh = existing.layout.h || 0

            // Rectangle Intersection Logic
            return (
              attemptX < ex + ew &&
              attemptX + w > ex &&
              attemptY < ey + eh &&
              attemptY + h > ey
            )
          })

          if (!hasCollision) {
            targetX = attemptX
            targetY = attemptY
          }
        }
      }
    }
  }

  if (targetY + h > SAFE_ROWS) {
    targetPageIndex++
    targetX = 0
    targetY = 0
  }

  const newPageCount = Math.max(dashboard.pageCount, targetPageIndex + 1)

  // Update Page Count if needed
  if (newPageCount > dashboard.pageCount) {
    useProjectStore.getState().setCanvasConfig({ pageCount: newPageCount })
  }

  useProjectStore.getState().addWidget({
    id,
    sourceMessageId: messageId,
    widgetId: widgetId || id,
    reportData: { ...reportData, timestamp: timestamp ?? reportData.timestamp },
    layout: { i: id, x: targetX, y: targetY, w, h },
    pageIndex: targetPageIndex,
  })
}

const updateGlobalLayout = (layouts: Layout[]) => {
  const layoutMap = new Map(layouts.map(l => [l.i, l]))
  const { dashboard } = getSessionState()
  if (!dashboard) return

  let maxPageIndex = 0
  const updates = dashboard.widgets.map(r => {
    const globalLayout = layoutMap.get(r.id)
    if (globalLayout) {
      const globalY = globalLayout.y
      const pageIndex = Math.floor(globalY / ROWS_PER_PAGE)
      const localY = globalY % ROWS_PER_PAGE
      maxPageIndex = Math.max(maxPageIndex, pageIndex)
      return {
        ...r,
        pageIndex,
        layout: { ...r.layout, ...globalLayout, y: localY },
      }
    }
    return r
  })

  // We need to batch update widgets? ProjectStore doesn't have batch update.
  // Assuming updateLayout handles batch if passed correctly, OR we iterate.
  // But wait, updateLayout in ProjectStore takes `layout: any`.
  // I implemented it as taking array of {i, ...}.
  // But here we are changing pageIndex too.
  // I should probably use `updateWidget` for each? Or improve `updateLayout`.
  // For now, let's iterate.

  updates.forEach(u => {
    // Only update if changed?
    useProjectStore.getState().updateWidget(u.id, u)
  })

  if (maxPageIndex + 1 > dashboard.pageCount) {
    useProjectStore.getState().setCanvasConfig({ pageCount: maxPageIndex + 1 })
  }
}

const updateLayout = (layouts: Layout[]) => {
  // Local layout update (within page)
  useProjectStore.getState().updateLayout(layouts)
  // Recalc page count logic if needed?
  // Original store did:
  /*
        const maxPageIndex = nextPinnedReports.reduce(...)
        return { pageCount: Math.max(state.pageCount, maxPageIndex + 1) }
    */
  // Since updateLayout doesn't change pageIndex, pageCount shouldn't change generally,
  // unless we allow dragging between pages via this method (usually via updateGlobalLayout).
}

const moveWidgetToPage = (reportId: string, targetPageIndex: number) => {
  const { dashboard } = getSessionState()
  if (!dashboard) return
  const report = dashboard.widgets.find(r => r.id === reportId)
  if (!report) return

  const reportsOnTargetPage = dashboard.widgets.filter(
    r => r.pageIndex === targetPageIndex && r.id !== reportId
  )
  const maxY = reportsOnTargetPage.reduce(
    (max, r) => Math.max(max, (r.layout.y ?? 0) + (r.layout.h ?? 0)),
    0
  )

  useProjectStore.getState().updateWidget(reportId, {
    pageIndex: targetPageIndex,
    layout: { ...report.layout, y: maxY },
  })

  if (targetPageIndex + 1 > dashboard.pageCount) {
    useProjectStore
      .getState()
      .setCanvasConfig({ pageCount: targetPageIndex + 1 })
  }
}

const setCanvasConfig = (updates: Partial<WorkbenchState['canvasConfig']>) => {
  // Map 'layout' -> 'layoutMode'
  const mappedUpdates: any = { ...updates }
  if (updates.layout) mappedUpdates.layoutMode = updates.layout
  if (updates.title) mappedUpdates.title = updates.title // ProjectStore syncs title

  useProjectStore.getState().setCanvasConfig(mappedUpdates)

  // Page count logic from original
  if (updates.layout === 'a4') {
    const { dashboard } = getSessionState()
    if (dashboard && dashboard.layoutMode !== 'a4') {
      const maxPageIndex = dashboard.widgets.reduce(
        (max, item) => Math.max(max, item.pageIndex || 0),
        0
      )
      const newPageCount = Math.max(dashboard.pageCount, maxPageIndex + 1)
      useProjectStore.getState().setCanvasConfig({ pageCount: newPageCount })
    }
  }
}

// --- The Hook ---
export const useWorkbenchStore = <T = WorkbenchState>(
  selector?: (state: WorkbenchState) => T
): T => {
  const projectState = useProjectStore()
  const session = projectState.sessions.find(
    s => s.id === projectState.activeSessionId
  )
  const dashboard = session?.dashboard

  // Resolve reports
  const resolvedReports = useMemo(
    () =>
      (dashboard?.widgets || []).map(w => {
        const reportData = projectState.widgetRegistry[w.widgetId]
        if (reportData) {
          return { ...w, reportData }
        }
        return w as any
      }) as DenormalizedReportWidget[],
    [dashboard?.widgets, projectState.widgetRegistry]
  )

  const state: WorkbenchState = {
    pinnedReports: resolvedReports,
    layoutScenario: projectState.layoutScenario,
    canvasConfig: {
      layout: dashboard?.layoutMode || 'a4',
      zoom: dashboard?.zoom || 80,
      title: session?.title || 'Untitled',
    },
    pageCount: dashboard?.pageCount || 1,
    editingReportId: projectState.editingReportId,
    language: useSettingsStore.getState().language,

    pinReport,
    removeReport: id => useProjectStore.getState().removeWidget(id),
    updateReportTitle: (id, title) => {
      const { dashboard, projectState } = getSessionState()
      const widget = dashboard?.widgets.find(w => w.id === id)

      if (widget) {
        useProjectStore.getState().updateReportTitle(id, title)
      } else {
        // Try registry
        const currentData = projectState.widgetRegistry[id]
        if (currentData) {
          useProjectStore.getState().updateRegistryEntry(id, { title })
        }
      }
    },
    updateReportConfig: (id, updates) => {
      const { dashboard, projectState } = getSessionState()
      const widget = dashboard?.widgets.find(w => w.id === id)

      if (widget) {
        const currentData = projectState.widgetRegistry[widget.widgetId]
        if (!currentData) return

        const nextVizConfig =
          updates.config !== undefined
            ? { ...currentData.vizConfig, ...updates.config }
            : currentData.vizConfig

        useProjectStore.getState().updateWidgetData(id, {
          chartType: updates.type ?? currentData.chartType,
          vizConfig: nextVizConfig,
          insight: updates.insight ?? currentData.insight,
        })
      } else {
        // Try direct registry update
        const currentData = projectState.widgetRegistry[id]
        if (currentData) {
          const nextVizConfig =
            updates.config !== undefined
              ? { ...currentData.vizConfig, ...updates.config }
              : currentData.vizConfig

          useProjectStore.getState().updateRegistryEntry(id, {
            chartType: updates.type ?? currentData.chartType,
            vizConfig: nextVizConfig,
            insight: updates.insight ?? currentData.insight,
          })
        }
      }
    },
    updateLayout,
    updateGlobalLayout,
    moveWidgetToPage,
    setLayoutScenario: s => useProjectStore.getState().setLayoutScenario(s),
    setCanvasConfig,
    setPageCount: c =>
      useProjectStore.getState().setCanvasConfig({ pageCount: Math.max(1, c) }),
    incrementPageCount: () => {
      const { dashboard } = getSessionState()
      if (dashboard)
        useProjectStore
          .getState()
          .setCanvasConfig({ pageCount: dashboard.pageCount + 1 })
    },
    setEditingReportId: id => useProjectStore.getState().setEditingReportId(id),
    reset: () => {
      /* Project reset? */
    },
  }

  return selector ? selector(state) : (state as unknown as T)
}

// Mock getState
useWorkbenchStore.getState = () => {
  const { projectState, session, dashboard } = getSessionState()

  // Resolve reports
  const resolvedReports = (dashboard?.widgets || []).map(w => {
    const reportData = projectState.widgetRegistry[w.widgetId]
    if (reportData) {
      return { ...w, reportData }
    }
    return w as any
  }) as DenormalizedReportWidget[]

  return {
    pinnedReports: resolvedReports,
    layoutScenario: projectState.layoutScenario,
    canvasConfig: {
      layout: dashboard?.layoutMode || 'a4',
      zoom: dashboard?.zoom || 80,
      title: session?.title || 'Untitled',
    },
    pageCount: dashboard?.pageCount || 1,
    editingReportId: projectState.editingReportId,
    language: useSettingsStore.getState().language,
    pinReport,
    removeReport: id => useProjectStore.getState().removeWidget(id),
    updateReportTitle: (id, title) =>
      useProjectStore.getState().updateReportTitle(id, title),
    updateReportConfig: (id, updates) => {
      const projectState = useProjectStore.getState()
      const session = projectState.sessions.find(
        s => s.id === projectState.activeSessionId
      )
      const msg = session?.messages.find(m => m.id === id)
      const reportData = msg?.widgetId
        ? projectState.widgetRegistry[msg.widgetId]
        : undefined

      useProjectStore.getState().updateMessage(id, {
        reportData: {
          ...(reportData || { title: 'Untitled' }),
          chartType: updates.type,
          vizConfig: updates.config,
          insight: updates.insight,
        },
      })
    },
    updateLayout,
    updateGlobalLayout,
    moveWidgetToPage,
    setLayoutScenario: s => useProjectStore.getState().setLayoutScenario(s),
    setCanvasConfig,
    setPageCount: c =>
      useProjectStore.getState().setCanvasConfig({ pageCount: Math.max(1, c) }),
    incrementPageCount: () => {
      const { dashboard } = getSessionState()
      if (dashboard)
        useProjectStore
          .getState()
          .setCanvasConfig({ pageCount: dashboard.pageCount + 1 })
    },
    setEditingReportId: id => useProjectStore.getState().setEditingReportId(id),
    reset: () => {},
  }
}

// Mock persist
useWorkbenchStore.persist = {
  hasHydrated: () => true,
  rehydrate: () => Promise.resolve(),
  onFinishHydration: () => {},
}
