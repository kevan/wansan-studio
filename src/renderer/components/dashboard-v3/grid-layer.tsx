import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import debounce from 'lodash.debounce'
import {
  Responsive,
  WidthProvider,
  type Layout,
  type Layouts,
} from 'react-grid-layout'

import { ReportCard } from '@/components/canvas/ReportCard'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import {
  GRID_ROW_HEIGHT,
  PAGE_GAP_PX,
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
} from './page-layer'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)
const GRID_MARGIN: [number, number] = [20, 20]

interface GridLayerProps {
  width: number
  height?: number
  isA4: boolean
  scale: number
}

const FOOTER_HEIGHT_PX = 80
const PAGE_TOTAL_HEIGHT = PAGE_HEIGHT_PX + PAGE_GAP_PX

const adjustLayoutForGaps = (layout: Layout[]): Layout[] =>
  layout.map(item => {
    const newItem = { ...item }
    
    const itemTopPx = item.y * GRID_ROW_HEIGHT
    const itemBottomPx = (item.y + item.h) * GRID_ROW_HEIGHT
    
    // Check which page the TOP of the card is on
    const pageIndex = Math.floor(itemTopPx / PAGE_TOTAL_HEIGHT)
    
    // The visual bottom limit of the content area on this page
    // (Start of Page) + (Page Height) - (Footer Safe Zone)
    const pageContentBottomPx = (pageIndex * PAGE_TOTAL_HEIGHT) + (PAGE_HEIGHT_PX - FOOTER_HEIGHT_PX)
    
    // If the card extends beyond the safe content area
    if (itemBottomPx > pageContentBottomPx) {
       // Move to next page top
       const nextPageTopPx = (pageIndex + 1) * PAGE_TOTAL_HEIGHT
       newItem.y = Math.ceil(nextPageTopPx / GRID_ROW_HEIGHT)
    }

    return newItem
  })

export function GridLayer({ width, height, isA4, scale }: GridLayerProps) {
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const updateLayout = useWorkbenchStore(state => state.updateLayout)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const updateReportTitle = useWorkbenchStore(state => state.updateReportTitle)

  const containerRef = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState(width)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const measureWidth = () => {
      if (isA4) {
        setGridWidth(PAGE_WIDTH_PX)
        return
      }
      const measured = containerRef.current?.clientWidth
      setGridWidth(measured && measured > 0 ? measured : width)
    }

    const handler = debounce(measureWidth, 150)
    measureWidth()
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('resize', handler)
      handler.cancel()
    }
  }, [isA4, width])

  const layouts = useMemo<Layouts>(() => {
    const baseLayout = pinnedReports.map(report => ({ ...report.layout }))
    const clone = () => baseLayout.map(item => ({ ...item }))
    return {
      lg: clone(),
      md: clone(),
      sm: clone(),
      xs: clone(),
      xxs: clone(),
    }
  }, [pinnedReports])

  const layoutMap = useMemo(
    () =>
      new Map<string, Layout>(
        pinnedReports.map(report => [report.id, report.layout])
      ),
    [pinnedReports]
  )

  const dispatchLayoutChange = useCallback(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('dashboard:layout-changed'))
    })
  }, [])

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[]) => {
      if (!isA4) {
        updateLayout(currentLayout)
        dispatchLayoutChange()
        return
      }

      const adjusted = adjustLayoutForGaps(currentLayout)
      const changed = JSON.stringify(adjusted) !== JSON.stringify(currentLayout)
      updateLayout(changed ? adjusted : currentLayout)

      if (changed) {
        setTimeout(() => dispatchLayoutChange(), 0)
      } else {
        dispatchLayoutChange()
      }
    },
    [dispatchLayoutChange, isA4, updateLayout]
  )

  useEffect(() => {
    dispatchLayoutChange()
  }, [dispatchLayoutChange, gridWidth, pinnedReports.length])

  const showGuideLines = isA4 || isDragging
  const pageBreaks = useMemo(() => {
    if (!showGuideLines) return []
    const maxRow = pinnedReports.reduce((acc, report) => {
      const y = Number.isFinite(report.layout?.y)
        ? (report.layout?.y as number)
        : 0
      const h = Number.isFinite(report.layout?.h)
        ? (report.layout?.h as number)
        : 0
      return Math.max(acc, y + h)
    }, 0)
    const estimatedHeight =
      maxRow * GRID_ROW_HEIGHT + Math.max(0, maxRow - 1) * GRID_MARGIN[1]
    const requiredPages = Math.max(
      1,
      Math.ceil(estimatedHeight / (PAGE_HEIGHT_PX + PAGE_GAP_PX))
    )
    return Array.from(
      { length: requiredPages - 1 },
      (_, idx) => PAGE_HEIGHT_PX * (idx + 1) + PAGE_GAP_PX * (idx + 1)
    )
  }, [pinnedReports, showGuideLines])

  return (
    <div
      ref={containerRef}
      className="relative z-10"
      style={height ? { height } : undefined}
    >
      {showGuideLines &&
        pageBreaks.map((offset, index) => (
          <div
            key={offset}
            className="pointer-events-none absolute left-0 right-0 border-b border-dashed border-red-200/80 opacity-70"
            style={{ top: offset }}
          >
            <span className="absolute -top-3 left-3 rounded bg-white px-2 text-[10px] font-semibold uppercase tracking-wide text-red-400 shadow-sm">
              Page {index + 2}
            </span>
          </div>
        ))}

      <ResponsiveGridLayout
        className="bg-transparent"
        transformScale={scale}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }}
        rowHeight={GRID_ROW_HEIGHT}
        width={gridWidth}
        margin={GRID_MARGIN}
        containerPadding={GRID_MARGIN}
        draggableHandle=".drag-handle"
        compactType={isA4 ? null : 'vertical'}
        preventCollision={!isA4}
        onLayoutChange={handleLayoutChange}
        onResizeStart={() => setIsDragging(true)}
        onResizeStop={layout => {
          setIsDragging(false)
          handleLayoutChange(layout)
        }}
        onDragStart={() => setIsDragging(true)}
        onDragStop={layout => {
          setIsDragging(false)
          handleLayoutChange(layout)
        }}
        style={{
          minHeight: height ?? PAGE_HEIGHT_PX,
          background: 'transparent',
        }}
      >
        {pinnedReports.map(report => (
          <div
            key={report.id}
            data-grid={layoutMap.get(report.id) ?? report.layout}
          >
            <div className="relative h-full">
              <ReportCard
                report={report}
                onRemove={() => removeReport(report.id)}
                onTitleChange={newTitle =>
                  updateReportTitle(report.id, newTitle)
                }
                className="h-full w-full"
              />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}
