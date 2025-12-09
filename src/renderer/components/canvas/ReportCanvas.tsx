import React, { useCallback } from 'react'
import { useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { DashboardWidget } from '../DashboardWidget'
import { X, GripHorizontal } from 'lucide-react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

export function ReportCanvas() {
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const updateReportTitle = useWorkbenchStore(state => state.updateReportTitle)
  const updateLayout = useWorkbenchStore(state => state.updateLayout)

  const handleLayoutChange = useCallback(
    (layout: any[]) => {
      updateLayout(layout)
    },
    [updateLayout]
  )

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
    <div className="h-full w-full bg-zinc-50/50 p-6 overflow-y-auto">
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
            className="group relative bg-white border border-zinc-200 shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-all flex flex-col"
          >
            {/* Drag Handle */}
            <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing drag-handle z-20 hover:bg-zinc-50 transition-colors opacity-0 group-hover:opacity-100">
              <GripHorizontal className="w-4 h-4 text-zinc-300" />
            </div>

            {/* Controls */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex gap-2">
              <button
                onClick={e => {
                  e.stopPropagation() // Prevent drag start if clicking button
                  removeReport(report.id)
                }}
                onMouseDown={e => e.stopPropagation()}
                className="p-1.5 bg-white text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md border border-zinc-200 shadow-sm transition-colors cursor-pointer"
                title="Remove from Dashboard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 pt-4">
              <DashboardWidget
                {...report.reportData}
                variant="dashboard"
                onTitleChange={newTitle =>
                  updateReportTitle(report.id, newTitle)
                }
                className="h-full"
              />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}
