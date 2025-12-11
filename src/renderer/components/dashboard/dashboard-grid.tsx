import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import debounce from 'lodash.debounce'
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout'
import { Database, Sparkles } from 'lucide-react'

import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { ReportCard } from '../canvas/ReportCard'
import { cn } from '@/utils/cn'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)
const ROW_HEIGHT = 30
const GRID_MARGIN: [number, number] = [12, 12]
const A4_CONTENT_WIDTH = 794
const DEFAULT_SCREEN_WIDTH = 1200
const PAGE_HEIGHT_PX = 1123 // ~297mm at 96 DPI
const PAGE_GAP = 30

export function DashboardGrid() {
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const updateLayout = useWorkbenchStore(state => state.updateLayout)
  const canvasConfig = useWorkbenchStore(state => state.canvasConfig)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const updateReportTitle = useWorkbenchStore(state => state.updateReportTitle)
  const isA4 = canvasConfig.layout === 'a4'

  const containerRef = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState<number>(() =>
    isA4 ? A4_CONTENT_WIDTH : DEFAULT_SCREEN_WIDTH
  )
  const [isDragging, setIsDragging] = useState(false)

  const pageExtentsPx = useMemo(() => {
    const maxRow = pinnedReports.reduce(
      (acc, report) => {
        const y = Number.isFinite(report.layout?.y) ? (report.layout?.y as number) : 0
        const h = Number.isFinite(report.layout?.h) ? (report.layout?.h as number) : 0
        return Math.max(acc, y + h)
      },
      0
    )
    const heightWithMargin =
      maxRow * ROW_HEIGHT + Math.max(0, maxRow - 1) * GRID_MARGIN[1]
    const pageCount = Math.max(1, Math.ceil(heightWithMargin / PAGE_HEIGHT_PX))
    const totalHeight =
      pageCount * PAGE_HEIGHT_PX + Math.max(0, pageCount - 1) * PAGE_GAP

    return { pageCount, totalHeight }
  }, [pinnedReports])

  const pageNumbers = useMemo(
    () => Array.from({ length: pageExtentsPx.pageCount }, (_, idx) => idx),
    [pageExtentsPx.pageCount]
  )

  useEffect(() => {
    const measureWidth = () => {
      if (!containerRef.current) return
      const measured = containerRef.current.clientWidth || DEFAULT_SCREEN_WIDTH
      setGridWidth(isA4 ? A4_CONTENT_WIDTH : measured || DEFAULT_SCREEN_WIDTH)
    }

    const handler = debounce(measureWidth, 150)
    measureWidth()

    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('resize', handler)
      handler.cancel()
    }
  }, [isA4, pinnedReports.length])

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
    () => new Map<string, Layout>(pinnedReports.map(report => [report.id, report.layout])),
    [pinnedReports]
  )

  const showGuides = isA4 || isDragging

  const pageBreaks = useMemo(() => {
    if (!showGuides || pageNumbers.length <= 1) return []
    return pageNumbers
      .slice(0, -1)
      .map(idx => (idx + 1) * PAGE_HEIGHT_PX + idx * PAGE_GAP)
  }, [pageNumbers, showGuides])

  const dispatchLayoutChange = useCallback(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('dashboard:layout-changed'))
    })
  }, [])

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[]) => {
      updateLayout(currentLayout)
      dispatchLayoutChange()
    },
    [dispatchLayoutChange, updateLayout]
  )

  useEffect(() => {
    dispatchLayoutChange()
  }, [dispatchLayoutChange, gridWidth, pinnedReports.length])

  const hasReports = pinnedReports.length > 0

  const EmptyState = () => (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white/60 text-center text-zinc-500">
      <div className="mb-3 rounded-full bg-white p-3 shadow-sm">
        <svg
          className="h-8 w-8 text-zinc-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-zinc-700">Canvas Empty</p>
      <p className="text-xs text-zinc-500">
        Pin charts from the chat to build your dashboard.
      </p>
    </div>
  )

  const PageBackgrounds = () =>
    isA4 ? (
      <div
        className="pointer-events-none absolute inset-0 z-0 flex flex-col"
        style={{ gap: `${PAGE_GAP}px` }}
      >
        {pageNumbers.map(page => (
          <div
            key={page}
            className="relative w-full rounded-lg border border-zinc-200 bg-white shadow-md"
            style={{ height: PAGE_HEIGHT_PX }}
          >
            <div className="absolute bottom-4 right-6 text-xs text-zinc-300">
              Page {page + 1}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 border-t px-8 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <div className="bg-black text-white p-1 rounded">
                  <Database className="h-3 w-3" />
                </div>
                <span className="font-semibold text-zinc-600">Project Wansan</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                <span>AI-Powered Local BI</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : null

  return (
    <div
      ref={containerRef}
      className="relative min-h-[500px]"
      style={isA4 ? { height: pageExtentsPx.totalHeight } : undefined}
    >
      <PageBackgrounds />

      {showGuides &&
        pageBreaks.map((offset, index) => (
          <div
            key={offset}
            className="pointer-events-none absolute left-0 right-0 border-b-2 border-dashed border-red-200/80 opacity-80"
            style={{ top: offset }}
          >
            <span className="absolute -top-3 left-3 rounded bg-white px-2 text-[10px] font-semibold uppercase tracking-wide text-red-400 shadow-sm">
              Page {index + 2}
            </span>
          </div>
        ))}

      <ResponsiveGridLayout
        className={cn('relative z-10', isA4 && 'bg-transparent')}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }}
        rowHeight={ROW_HEIGHT}
        width={gridWidth}
        margin={GRID_MARGIN}
        draggableHandle=".drag-handle"
        onLayoutChange={handleLayoutChange}
        onResizeStart={() => setIsDragging(true)}
        onResizeStop={() => {
          setIsDragging(false)
          dispatchLayoutChange()
        }}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => {
          setIsDragging(false)
          dispatchLayoutChange()
        }}
        style={isA4 ? { height: pageExtentsPx.totalHeight, background: 'transparent' } : {}}
      >
        {pinnedReports.map(report => (
          <div key={report.id} data-grid={layoutMap.get(report.id) ?? report.layout}>
            <div className="relative h-full">
              <ReportCard
                report={report}
                onRemove={() => removeReport(report.id)}
                onTitleChange={newTitle => updateReportTitle(report.id, newTitle)}
                className="h-full w-full"
              />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {!hasReports && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
          <EmptyState />
        </div>
      )}
    </div>
  )
}
