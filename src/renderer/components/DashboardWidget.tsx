import React, { useState } from 'react'
import { A4Header, A4Summary, A4Chart } from './A4Canvas'
import { BigNumberDisplay } from './BigNumberDisplay'
import { cn } from '../utils/cn'
import { Lightbulb } from 'lucide-react'
import { ReportTable } from './report/report-table'
import { useTranslation } from 'react-i18next'

interface DashboardWidgetProps {
  title: string
  subtitle?: string
  summary?: string
  insights?: string[]
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'table' | 'scatter' | 'kpi'
  chartTitle?: string
  tableData?: Array<Record<string, any>>
  vizConfig?: {
    x_axis?: string | null
    y_axis?: string | string[] | null
    series_name?: string
  }
  timestamp?: number
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
  timestamp,
}: DashboardWidgetProps) {
  const [showSummary, setShowSummary] = useState(false)
  const { t } = useTranslation('common')
  const tableColumns =
    tableData && tableData.length > 0 ? Object.keys(tableData[0]) : []
  const showBigNumber =
    (chartType === 'table' || chartType === 'kpi') &&
    tableData &&
    tableData.length === 1 &&
    Object.keys(tableData[0]).length > 0
  const shouldShowTable =
    tableData &&
    tableData.length > 0 &&
    !showBigNumber &&
    (chartType === 'table' ||
      chartType === 'kpi' ||
      !vizConfig?.x_axis ||
      !vizConfig?.y_axis)

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
                    'p-2 rounded-full transition-colors hide-on-export',
                    showSummary
                      ? 'bg-yellow-50 text-yellow-600'
                      : 'text-zinc-400 hover:text-yellow-600 hover:bg-zinc-50'
                  )}
                  onMouseEnter={() => setShowSummary(true)}
                  onMouseLeave={() => setShowSummary(false)}
                  title={t('summary')}
                >
                  <Lightbulb className="w-5 h-5" />
                </button>

                {/* Tooltip Content */}
                {showSummary && (
                  <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-white rounded-lg shadow-xl border border-zinc-200 z-50 text-sm text-zinc-600 animate-in fade-in slide-in-from-top-1">
                    <div className="font-medium text-zinc-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      {t('summary')}
                    </div>
                    <div className="max-h-60 overflow-y-auto">{summary}</div>
                    {timestamp && (
                      <div className="mt-3 pt-2 border-t border-zinc-100 text-xs text-zinc-400">
                        <div className="font-medium text-zinc-500 mb-0.5">
                          {t('generated_time')}
                        </div>
                        <div className="font-mono">
                          {new Date(timestamp).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : undefined
          }
        />

        {/* Chart takes priority space */}
        <div className="flex-1 min-h-0 w-full mb-0">
          {chartType !== 'table' &&
            chartType !== 'kpi' &&
            vizConfig?.x_axis &&
            vizConfig?.y_axis && (
              <A4Chart
                type={chartType}
                title={chartTitle}
                data={tableData}
                config={vizConfig}
                className="h-full w-full"
              />
            )}

          {/* Big Number Mode for Dashboard */}
          {showBigNumber && (
            <div className="h-full w-full flex items-center justify-center">
              <BigNumberDisplay
                value={Object.values(tableData[0])[0]}
                label={Object.keys(tableData[0])[0]}
                variant={variant}
                />
              </div>
            )}

          {/* Fallback to Data Table (Hide if Big Number is shown) */}
          {shouldShowTable && (
            <div className="h-full w-full overflow-auto space-y-4">
              {chartType === 'kpi' && tableData.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {tableData.slice(0, 4).map((row, idx) => {
                    const entries = Object.entries(row)
                    const first = entries[0] || ['Value', '—']
                    const second = entries[1]
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
                      >
                        <div className="text-xs text-zinc-500 mb-1">
                          {first[0]}
                        </div>
                        <div className="text-xl font-semibold text-zinc-900">
                          {first[1] as any}
                        </div>
                        {second && (
                          <div className="text-xs text-zinc-500 mt-1">
                            {second[0]}: {second[1] as any}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <ReportTable
                data={tableData}
                columns={tableColumns}
                variant="dashboard"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default Chat Layout (Linear, scrollable)
  return (
    <div className={cn('flex flex-col h-full p-6 bg-white', className)}>
      <A4Header
        title={title}
        subtitle={subtitle}
        className="mb-4 pb-2"
        timestamp={timestamp}
        showTimestamp={false}
      />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-2">
        {summary && (
          <div className="prose prose-sm text-zinc-600 leading-relaxed mb-4 px-4">
            <A4Summary content={summary} insights={insights} />
          </div>
        )}

        {chartType !== 'table' &&
          chartType !== 'kpi' &&
          vizConfig?.x_axis &&
          vizConfig?.y_axis && (
          <div className="h-[250px] w-full px-4 pb-4 pt-2">
            <A4Chart
              type={chartType}
              title={chartTitle}
              data={tableData}
              config={vizConfig}
              className="h-full w-full"
            />
          </div>
        )}

        {/* Big Number Mode */}
        {showBigNumber && (
          <div className="h-full w-full flex items-center justify-center">
            <BigNumberDisplay
              value={Object.values(tableData[0])[0]}
              label={Object.keys(tableData[0])[0]}
              variant={variant}
              />
            </div>
          )}

        {/* Data Table */}
        {shouldShowTable && (
          <div>
            <h4 className="text-sm font-semibold text-zinc-800 mb-2">
              Data Detail
            </h4>
            <ReportTable
              data={tableData}
              columns={tableColumns}
              variant="chat"
            />
          </div>
        )}
      </div>
    </div>
  )
}
