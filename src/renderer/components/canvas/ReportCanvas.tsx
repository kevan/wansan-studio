import React, { useCallback, useMemo, useEffect } from 'react'
import { Database, Sparkles } from 'lucide-react'
import { LayoutScenario, useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { ReportCard } from './ReportCard'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { cn } from '@/utils/cn'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

export function ReportCanvas() {
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const updateReportTitle = useWorkbenchStore(state => state.updateReportTitle)
  const updateLayout = useWorkbenchStore(state => state.updateLayout)
  const layoutScenario = useWorkbenchStore(state => state.layoutScenario)
  const setLayoutScenario = useWorkbenchStore(state => state.setLayoutScenario)
  const canvasConfig = useWorkbenchStore(state => state.canvasConfig)

  const { layout, zoom } = canvasConfig
  const zoomScale = zoom / 100
  const isA4 = layout === 'a4'
  const generatedDate = useMemo(() => new Date().toLocaleDateString(), [])

  // Keep legacy layout preset logic aligned with new layout toggle
  useEffect(() => {
    const targetScenario: LayoutScenario = isA4 ? 'print' : 'default'
    if (layoutScenario !== targetScenario) {
      setLayoutScenario(targetScenario)
    }
  }, [isA4, layoutScenario, setLayoutScenario])

  const layoutPresets: Record<
    LayoutScenario,
    {
      cols: { lg: number; md: number; sm: number; xs: number; xxs: number }
      rowHeight: number
      margin: [number, number]
      containerClass: string
      style?: React.CSSProperties
      canvasSize?: { width?: string; height?: string }
    }
  > = useMemo(
    () => ({
      default: {
        cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
        rowHeight: 60,
        margin: [16, 16],
        containerClass: '',
      },
      print: {
        cols: { lg: 8, md: 8, sm: 6, xs: 4, xxs: 2 },
        rowHeight: 54,
        margin: [12, 12],
        containerClass: 'max-w-5xl mx-auto print:w-full',
        style: { aspectRatio: '210 / 297' },
        canvasSize: { width: '210mm', height: '297mm' },
      },
      large: {
        cols: { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 },
        rowHeight: 70,
        margin: [20, 20],
        containerClass: 'max-w-[1800px] mx-auto',
        style: { aspectRatio: '16 / 9' },
        canvasSize: { width: '100%', height: '56.25vw' }, // 16:9
      },
      ppt: {
        cols: { lg: 6, md: 6, sm: 4, xs: 4, xxs: 2 },
        rowHeight: 70,
        margin: [16, 16],
        containerClass: 'max-w-6xl mx-auto',
        style: { aspectRatio: '16 / 9' },
        canvasSize: { width: '1920px', height: '1080px' },
      },
      email: {
        cols: { lg: 1, md: 1, sm: 1, xs: 1, xxs: 1 },
        rowHeight: 68,
        margin: [12, 12],
        containerClass: 'max-w-3xl mx-auto',
        canvasSize: { width: '800px', height: 'auto' },
      },
    }),
    []
  )

  const currentPreset = layoutPresets[layoutScenario] ?? layoutPresets.default
  const maxCols = currentPreset.cols.lg || 12
  const normalizedLayouts = useMemo(
    () =>
      pinnedReports.map(r => {
        const width = (() => {
          switch (layoutScenario) {
            case 'print':
              return Math.min(r.layout.w, 4)
            case 'large':
              return Math.min(r.layout.w, 4)
            case 'ppt':
              return Math.min(r.layout.w, 3)
            case 'email':
              return 1
            default:
              return r.layout.w
          }
        })()

        const height = (() => {
          switch (layoutScenario) {
            case 'print':
              return Math.max(r.layout.h, 4)
            case 'large':
              return Math.max(r.layout.h, 5)
            case 'ppt':
              return Math.max(r.layout.h, 5)
            case 'email':
              return Math.max(r.layout.h, 4)
            default:
              return r.layout.h
          }
        })()

        return {
          ...r.layout,
          w: Math.min(width, maxCols),
          h: height,
        }
      }),
    [pinnedReports, maxCols, layoutScenario]
  )
  const responsiveLayouts = useMemo(
    () => ({
      lg: normalizedLayouts,
      md: normalizedLayouts,
      sm: normalizedLayouts,
      xs: normalizedLayouts,
      xxs: normalizedLayouts,
    }),
    [normalizedLayouts]
  )
  const layoutMap = useMemo(
    () => new Map(normalizedLayouts.map(l => [l.i, l])),
    [normalizedLayouts]
  )

  useEffect(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('dashboard:layout-changed'))
    })
  }, [pinnedReports.length, zoom, layoutScenario])

  const handleLayoutChange = useCallback(
    (layout: any[]) => {
      updateLayout(layout)
      // Notify charts to resize after layout settles
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('dashboard:layout-changed'))
      })
    },
    [updateLayout]
  )

  const handleResizeStop = useCallback(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('dashboard:layout-changed'))
    })
  }, [])

  const canvasContent =
    pinnedReports.length === 0 ? (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-zinc-400">
        <div className="mb-4 rounded-full bg-zinc-100 p-4">
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
        <h3 className="text-sm font-medium text-zinc-900">Canvas Empty</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Pin charts from the chat to build your dashboard.
        </p>
      </div>
    ) : (
      <ResponsiveGridLayout
        className="layout"
        layouts={responsiveLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={currentPreset.cols}
        rowHeight={currentPreset.rowHeight}
        draggableHandle=".drag-handle"
        onLayoutChange={handleLayoutChange}
        onResizeStop={handleResizeStop}
        onDragStop={handleResizeStop}
        margin={currentPreset.margin}
      >
        {pinnedReports.map(report => (
          <div key={report.id} data-grid={layoutMap.get(report.id) ?? report.layout}>
            <ReportCard
              report={report}
              onRemove={() => removeReport(report.id)}
              onTitleChange={newTitle => updateReportTitle(report.id, newTitle)}
              className="h-full w-full"
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    )

  return (
    <div className="h-full w-full overflow-auto bg-zinc-100/60 dark:bg-zinc-900">
      <div className="mx-auto flex justify-center p-6">
        <div
          className="flex w-full justify-center"
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <div
            id="report-canvas-paper"
            className={cn(
              'origin-top transition-all duration-300 flex flex-col',
              currentPreset.containerClass,
              isA4
                ? 'w-[210mm] min-h-[297mm] bg-white shadow-lg rounded-lg border border-zinc-200'
                : 'w-full bg-transparent shadow-none'
            )}
            style={{
              ...currentPreset.style,
              width: isA4 ? '210mm' : currentPreset.canvasSize?.width ?? '100%',
              minHeight: isA4 ? '297mm' : '100%',
              height: currentPreset.canvasSize?.height ?? 'auto',
            }}
          >
            <div className="flex-1 p-8">
              {canvasContent}
            </div>
            {isA4 && (
              <div className="mt-auto flex-none h-16 border-t mx-8 mb-4 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <div className="bg-black text-white p-1 rounded">
                    <Database className="h-3 w-3" />
                  </div>
                  <span className="font-semibold text-zinc-600">Project Wansan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                  <span>AI-Powered Local BI</span>
                  <span className="mx-2 text-zinc-300">|</span>
                  <span>{generatedDate}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
