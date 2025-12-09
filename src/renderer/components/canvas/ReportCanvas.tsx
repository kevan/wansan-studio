import React, { useCallback } from 'react'
import { useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { ReportCard } from './ReportCard'
import { Printer, FileCode } from 'lucide-react'
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
  const addToast = useToastStore(state => state.addToast)

  const handleLayoutChange = useCallback(
    (layout: any[]) => {
      updateLayout(layout)
    },
    [updateLayout]
  )

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

      <div className="flex-1 overflow-y-auto p-6" id="report-canvas-content">
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: pinnedReports.map(r => r.layout) }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          draggableHandle=".drag-handle"
          onLayoutChange={handleLayoutChange}
          margin={[16, 16]}
        >
          {pinnedReports.map(report => (
            <div
              key={report.id}
              data-grid={report.layout}
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
  )
}
