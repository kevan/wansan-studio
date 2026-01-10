import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type Layout,
  type Layouts,
  Responsive,
  WidthProvider,
} from 'react-grid-layout'

import { DashboardReportCard as ReportCard } from '@/components/viz/containers/DashboardReportCard'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { useProjectStore } from '@/stores/useProjectStore'
import {
  GRID_MARGIN_Y,
  GRID_ROW_HEIGHT,
  PAGE_GAP_PX,
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
  ROWS_PER_PAGE,
  SCREEN_WIDTH_PX,
} from './page-layer'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { ArrowDown, ArrowUp } from 'lucide-react'

const ResponsiveGridLayout = WidthProvider(Responsive)
const GRID_MARGIN: [number, number] = [20, GRID_MARGIN_Y]

interface GridLayerProps {
  width: number
  height?: number
  isA4: boolean
  scale: number
}

interface PageGridProps {
  pageIndex: number
  width: number
  scale: number
  isA4: boolean
}

// --- A4 Page Grid (Physics-based) ---
function PageGrid({
  pageIndex,
  width,
  scale,
  isA4: _isA4,
}: PageGridProps) {
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const updateLayout = useWorkbenchStore(state => state.updateLayout)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const moveWidgetToPage = useWorkbenchStore(state => state.moveWidgetToPage)

  const pageReports = useMemo(
    () => pinnedReports.filter(r => (r.pageIndex || 0) === pageIndex),
    [pinnedReports, pageIndex]
  )

  const layouts = useMemo<Layouts>(() => {
    const baseLayout = pageReports.map(report => ({ ...report.layout }))
    const clone = () => baseLayout.map(item => ({ ...item }))
    return {
      lg: clone(),
      md: clone(),
      sm: clone(),
      xs: clone(),
      xxs: clone(),
    }
  }, [pageReports])

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[]) => {
      const changes: Layout[] = []
      currentLayout.forEach(l => {
        const original = pageReports.find(r => r.id === l.i)
        if (original) {
          if (
            original.layout.x !== l.x ||
            original.layout.y !== l.y ||
            original.layout.w !== l.w ||
            original.layout.h !== l.h
          ) {
            changes.push(l)
          }
        }
      })
      if (changes.length > 0) {
        updateLayout(changes)
      }
    },
    [pageReports, updateLayout]
  )

  return (
    <div className="relative w-full h-full">
      <ResponsiveGridLayout
        className="bg-transparent"
        transformScale={scale}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }}
        rowHeight={GRID_ROW_HEIGHT}
        width={width}
        margin={GRID_MARGIN}
        containerPadding={GRID_MARGIN}
        draggableHandle=".drag-handle"
        compactType={null} // Free layout for A4
        preventCollision={true} // Strict collision for A4
        isBounded={true} // Strict boundaries for A4
        maxRows={ROWS_PER_PAGE}
        onLayoutChange={handleLayoutChange}
        style={{ height: '100%' }}
      >
        {pageReports.map(report => (
          <div key={report.id} data-grid={report.layout}>
            <ContextMenu>
              <ContextMenuTrigger className="w-full h-full">
                <div className="relative h-full w-full">
                  <ReportCard
                    report={report}
                    onRemove={() => removeReport(report.id)}
                    onTitleChange={newTitle =>
                      useProjectStore.getState().updateWidgetData(report.id, { title: newTitle })
                    }
                    className="h-full w-full"
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  disabled={pageIndex === 0}
                  onClick={() => moveWidgetToPage(report.id, pageIndex - 1)}
                >
                  <ArrowUp className="w-4 h-4 mr-2" /> Move to Previous Page
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => moveWidgetToPage(report.id, pageIndex + 1)}
                >
                  <ArrowDown className="w-4 h-4 mr-2" /> Move to Next Page
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}

// --- Screen Grid (Infinite Scroll) ---
function ScreenGrid({ width, scale }: { width: number; scale: number }) {
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const updateGlobalLayout = useWorkbenchStore(
    state => state.updateGlobalLayout
  )
  const removeReport = useWorkbenchStore(state => state.removeReport)

  // Flatten reports: Convert (pageIndex, localY) -> globalY
  const flatReports = useMemo(() => {
    return pinnedReports.map(r => ({
      ...r,
      layout: {
        ...r.layout,
        y: (r.pageIndex || 0) * ROWS_PER_PAGE + r.layout.y,
      },
    }))
  }, [pinnedReports])

  const layouts = useMemo<Layouts>(() => {
    const baseLayout = flatReports.map(report => ({ ...report.layout }))
    const clone = () => baseLayout.map(item => ({ ...item }))
    return {
      lg: clone(),
      md: clone(),
      sm: clone(),
      xs: clone(),
      xxs: clone(),
    }
  }, [flatReports])

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[]) => {
      const changes: Layout[] = []
      currentLayout.forEach(l => {
        const original = flatReports.find(r => r.id === l.i)
        if (original) {
          if (
            original.layout.x !== l.x ||
            original.layout.y !== l.y ||
            original.layout.w !== l.w ||
            original.layout.h !== l.h
          ) {
            changes.push(l)
          }
        }
      })
      if (changes.length > 0) {
        updateGlobalLayout(changes)
      }
    },
    [flatReports, updateGlobalLayout]
  )

  return (
    <ResponsiveGridLayout
      className="bg-transparent"
      transformScale={scale}
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }}
      rowHeight={GRID_ROW_HEIGHT}
      width={width}
      margin={GRID_MARGIN}
      containerPadding={GRID_MARGIN}
      draggableHandle=".drag-handle"
      compactType="vertical" // Vertical compaction for Screen mode
      preventCollision={false} // Allow pushing for infinite scroll
      isBounded={false}
      onLayoutChange={handleLayoutChange}
      // Ensure minHeight is enough to scroll, and add padding at bottom for infinite feel
      style={{ minHeight: '100vh', paddingBottom: '400px' }}
    >
      {flatReports.map(report => (
        <div key={report.id} data-grid={report.layout}>
          <div className="relative h-full w-full">
            <ReportCard
              report={report}
              onRemove={() => removeReport(report.id)}
              onTitleChange={newTitle => useProjectStore.getState().updateWidgetData(report.id, { title: newTitle })}
              className="h-full w-full"
            />
          </div>
        </div>
      ))}
    </ResponsiveGridLayout>
  )
}

export function GridLayer({
  width,
  height: _height,
  isA4,
  scale,
}: GridLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState(width)
  const pageCount = useWorkbenchStore(state => state.pageCount)

  useEffect(() => {
    // In both A4 and Screen Simulation mode, we use fixed widths
    const targetWidth = isA4 ? PAGE_WIDTH_PX : SCREEN_WIDTH_PX
    setGridWidth(targetWidth)
  }, [isA4])

  if (!isA4) {
    return (
      <div ref={containerRef} className="relative z-10 w-full min-h-full">
        <ScreenGrid width={gridWidth} scale={scale} />
      </div>
    )
  }

  const pages = Array.from({ length: pageCount }, (_, i) => i)

  return (
    <div
      ref={containerRef}
      className="relative z-10 w-full"
      style={{
        height: pageCount * (PAGE_HEIGHT_PX + PAGE_GAP_PX),
      }}
    >
      {pages.map(pageIndex => (
        <div
          key={pageIndex}
          className="absolute left-0 right-0"
          style={{
            top: pageIndex * (PAGE_HEIGHT_PX + PAGE_GAP_PX),
            height: PAGE_HEIGHT_PX,
          }}
        >
          <PageGrid
            pageIndex={pageIndex}
            width={gridWidth}
            scale={scale}
            isA4={isA4}
          />
        </div>
      ))}
    </div>
  )
}
