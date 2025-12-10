import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { LayoutScenario, useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { ReportCard } from './ReportCard'
import { Printer, FileCode, Maximize2, Minimize2 } from 'lucide-react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { exportDashboardToHtml } from '../../utils/export-html'
import { useToastStore } from '../../stores/useToastStore'
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
  const addToast = useToastStore(state => state.addToast)
  const [scale, setScale] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  React.useEffect(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('dashboard:layout-changed'))
    })
  }, [pinnedReports.length, scale])

  React.useEffect(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('dashboard:layout-changed'))
    })
  }, [layoutScenario])

  useEffect(() => {
    const onFullChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullChange)
    return () => document.removeEventListener('fullscreenchange', onFullChange)
  }, [])

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

  const handlePrint = () => {
    window.print()
  }

  const handleExportHtml = async () => {
    try {
      await exportDashboardToHtml(pinnedReports)
      addToast({
        title: 'Export Success',
        description: 'Dashboard exported to HTML successfully.',
        type: 'success'
      })
    } catch (error) {
      console.error('Export HTML failed', error)
      addToast({
        title: 'Export Failed',
        description: 'Failed to export dashboard to HTML.',
        type: 'error'
      })
    }
  }

  const handleScaleChange = (value: number) => {
    setScale(value)
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('dashboard:layout-changed'))
    })
  }

  const toggleFullscreen = () => {
    const el = containerRef.current || document.documentElement
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  if (pinnedReports.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-zinc-400 bg-zinc-50/50">
        <div className="p-4 rounded-full bg-zinc-100 mb-4">
          <svg
            className="w-8 h-8 text-zinc-300"
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
        <p className="text-xs text-zinc-500 mt-1">
          Pin charts from the chat to build your dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-zinc-50/50">
      {/* Header with Print Button */}
      <div className="h-12 border-b border-zinc-200 bg-white px-4 flex items-center justify-between flex-shrink-0 no-print">
        <h2 className="text-sm font-semibold text-zinc-700">Report Canvas</h2>
        <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 flex items-center gap-2">
              <span>Layout</span>
              <select
                value={layoutScenario}
                onChange={e => setLayoutScenario(e.target.value as LayoutScenario)}
                className="text-xs border border-zinc-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
              >
                <option value="default">Default</option>
                <option value="print">Print (A4)</option>
                <option value="large">Large Screen (16:9)</option>
                <option value="ppt">PPT</option>
                <option value="email">Email</option>
              </select>
            </label>
            <label className="text-xs text-zinc-500 flex items-center gap-2">
              <span>Zoom</span>
              <select
                value={scale}
                onChange={e => handleScaleChange(Number(e.target.value))}
                className="text-xs border border-zinc-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
              >
                <option value={1}>100%</option>
                <option value={0.75}>75%</option>
                <option value={0.5}>50%</option>
              </select>
            </label>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
            onClick={handleExportHtml}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
            >
            <FileCode className="w-3.5 h-3.5" />
            Export HTML
            </button>
            <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
            >
            <Printer className="w-3.5 h-3.5" />
            Export PDF
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div
          ref={containerRef}
          className={`origin-top ${currentPreset.containerClass}`}
          style={{
            ...currentPreset.style,
            width:
              currentPreset.canvasSize?.width ?? '100%',
            height: currentPreset.canvasSize?.height ?? 'auto',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            // Preserve layout space while scaling visually
            minWidth: `calc(${currentPreset.canvasSize?.width ?? '100%'} / ${scale})`,
            maxWidth: `calc(${currentPreset.canvasSize?.width ?? '100%'} / ${scale})`,
          }}
        >
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
              <div
                key={report.id}
                data-grid={layoutMap.get(report.id) ?? report.layout}
              >
                <ReportCard
                  report={report}
                  onRemove={() => removeReport(report.id)}
                  onTitleChange={newTitle =>
                    updateReportTitle(report.id, newTitle)
                  }
                  className="h-full w-full"
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      </div>
    </div>
  )
}
