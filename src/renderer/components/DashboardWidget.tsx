import React, { useState } from 'react'
import { A4Header, A4Summary, A4Chart, A4DataTable } from './A4Canvas'
import { cn } from '../utils/cn'
import { Lightbulb } from 'lucide-react'

interface DashboardWidgetProps {
  title: string
  subtitle?: string
  summary?: string
  insights?: string[]
  chartType?: 'bar' | 'line' | 'pie' | 'area'
  chartTitle?: string
  tableData?: Array<Record<string, any>>
  vizConfig?: {
    x_axis: string
    y_axis: string
    series_name?: string
  }
  className?: string
  variant?: 'chat' | 'dashboard'
  onTitleChange?: (newTitle: string) => void
}

export function DashboardWidget({
  title,
  subtitle,
  summary,
  insights,
  chartType = 'bar',
  chartTitle,
  tableData,
  vizConfig,
  className,
  variant = 'chat',
  onTitleChange,
}: DashboardWidgetProps) {
  const [showSummary, setShowSummary] = useState(false)

  // Dashboard Layout (Chart focused)
  if (variant === 'dashboard') {
    return (
      <div className={cn('flex flex-col h-full p-6 bg-white', className)}>
        <A4Header
          title={title}
          subtitle={subtitle}
          className="mb-2 pb-2 flex-shrink-0"
          onTitleChange={onTitleChange}
          isEditable={true}
          showTimestamp={false}
          actions={
            summary ? (
              <div className="relative">
                <button
                  className={cn(
                    'p-2 rounded-full transition-colors',
                    showSummary
                      ? 'bg-yellow-50 text-yellow-600'
                      : 'text-zinc-400 hover:text-yellow-600 hover:bg-zinc-50'
                  )}
                  onMouseEnter={() => setShowSummary(true)}
                  onMouseLeave={() => setShowSummary(false)}
                  title="Show Summary"
                >
                  <Lightbulb className="w-5 h-5" />
                </button>

                {/* Tooltip Content */}
                {showSummary && (
                  <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-white rounded-lg shadow-xl border border-zinc-200 z-50 text-sm text-zinc-600 animate-in fade-in slide-in-from-top-1">
                    <div className="font-medium text-zinc-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Summary
                    </div>
                    <div className="max-h-60 overflow-y-auto">{summary}</div>
                  </div>
                )}
              </div>
            ) : undefined
          }
        />

        {/* Chart takes priority space */}
        <div className="flex-1 min-h-0 w-full mb-0">
          <A4Chart
            type={chartType}
            title={chartTitle}
            data={tableData}
            config={vizConfig}
            className="h-full w-full"
          />
        </div>
      </div>
    )
  }

  // Default Chat Layout (Linear, scrollable)
  return (
    <div className={cn('flex flex-col h-full p-6 bg-white', className)}>
      <A4Header title={title} subtitle={subtitle} className="mb-4 pb-2" />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-2">
        {summary && (
          <div className="prose prose-sm text-zinc-600 leading-relaxed mb-4 px-4">
            <A4Summary content={summary} insights={insights} />
          </div>
        )}

        <div className="h-[250px] w-full px-4 pb-4 pt-2">
          <A4Chart
            type={chartType}
            title={chartTitle}
            data={tableData}
            config={vizConfig}
            className="h-full w-full"
          />
        </div>

        {tableData && tableData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-zinc-800 mb-2">
              Data Detail
            </h4>
            <A4DataTable data={tableData} maxRows={10} className="text-xs" />
          </div>
        )}
      </div>
    </div>
  )
}
