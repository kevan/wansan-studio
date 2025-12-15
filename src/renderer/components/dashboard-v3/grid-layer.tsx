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
  ROWS_PER_PAGE,
  GRID_MARGIN_Y,
} from './page-layer'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
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

function PageGrid({ pageIndex, width, scale, isA4 }: PageGridProps) {
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const updateLayout = useWorkbenchStore(state => state.updateLayout)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const updateReportTitle = useWorkbenchStore(state => state.updateReportTitle)
  const moveWidgetToPage = useWorkbenchStore(state => state.moveWidgetToPage)
  const pageCount = useWorkbenchStore(state => state.pageCount)

  // Filter reports belonging to this page
  const pageReports = useMemo(
    () => pinnedReports.filter(r => (r.pageIndex || 0) === pageIndex),
    [pinnedReports, pageIndex]
  )

  const layouts = useMemo<Layouts>(() => {
    // Note: y is now local to the page
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
      // Only trigger update if something actually changed to avoid cycles
      // RGL triggers this on mount/resize too.
      // We need to compare with store state.
      
      const changes: Layout[] = []
      currentLayout.forEach(l => {
          const original = pageReports.find(r => r.id === l.i)
          if (original) {
              if (original.layout.x !== l.x || 
                  original.layout.y !== l.y || 
                  original.layout.w !== l.w || 
                  original.layout.h !== l.h) {
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

  // Calculate container height for this page grid
  // In A4 mode, it's fixed. In infinite mode, it's auto? 
  // For V3 refactor, we stick to "Page" concept even if not A4, or just 1 big page.
  // But isA4 prop dictates if we enforce boundaries.
  
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
        compactType={null} // Free layout inside page
        preventCollision={true} // Prevent items from overlapping
        // Actually for free layout usually compactType=null and preventCollision=true to mimic "placing"
        // But RGL default preventCollision=false means items push each other. That's good.
        // Let's stick to standard dashboard behavior: items push each other down.
        isBounded={isA4} // Keep inside page
        maxRows={isA4 ? ROWS_PER_PAGE : undefined}
        onLayoutChange={handleLayoutChange}
        style={{
           height: '100%'
        }}
      >
        {pageReports.map(report => (
          <div key={report.id}>
             <ContextMenu>
                <ContextMenuTrigger className="w-full h-full">
                    <div className="relative h-full w-full">
                    <ReportCard
                        report={report}
                        onRemove={() => removeReport(report.id)}
                        onTitleChange={newTitle =>
                        updateReportTitle(report.id, newTitle)
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

export function GridLayer({ width, height, isA4, scale }: GridLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState(width)
  
  // If we are not in A4 mode, we treat it as a single infinite page (pageIndex 0)
  // But store might have multiple pages? 
  // If layout='screen', we should probably ignore pageIndex and show everything in one grid?
  // For now, let's respect pageIndex structure even in screen mode to simplify logic, 
  // just render them one after another.
  
  const pageCount = useWorkbenchStore(state => state.pageCount)

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

  // Generate page containers
  const pages = useMemo(() => {
      return Array.from({ length: pageCount }, (_, i) => i)
  }, [pageCount])

  return (
    <div
      ref={containerRef}
      className="relative z-10 w-full"
      style={{
          // Total height calculation
          height: isA4 
            ? (pageCount * (PAGE_HEIGHT_PX + PAGE_GAP_PX)) 
            : '100%' 
      }}
    >
      {pages.map(pageIndex => (
        <div
            key={pageIndex}
            className="absolute left-0 right-0"
            style={{
                top: isA4 ? pageIndex * (PAGE_HEIGHT_PX + PAGE_GAP_PX) : 0,
                height: isA4 ? PAGE_HEIGHT_PX : '100%',
                // If screen mode, we stack them? Or just Page 0?
                // Logic: If screen mode, force pageIndex=0 view?
                // Let's assume A4 mode for this refactor primarily.
                display: (!isA4 && pageIndex > 0) ? 'none' : 'block' 
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