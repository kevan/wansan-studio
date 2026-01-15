import React, { useState } from 'react'
import { VizHeader } from './VizHeader'
import { VizChart, DrillDownActionType } from './VizChart'
import { KpiGrid } from '../base/KpiGrid'
import { cn } from '@/utils/cn'
import { Lightbulb } from 'lucide-react'
import { DataTable } from '../base/DataTable'
import { useTranslation } from 'react-i18next'
import { getDisplayMode } from '@/utils/viz-logic'
import type { ChartType, ReportData } from '@shared/types/dashboard'

interface VizRendererProps {
  title: string
  subtitle?: string
  summary?: string
  hideHeader?: boolean
  chartType?: ChartType
  chartTitle?: string
  tableData?: Array<Record<string, any>>
  columnFields?: Array<{ name: string; type: string }>
  columns?: string[]
  columnTypes?: Record<string, string>
  vizConfig?: ReportData['vizConfig']
  timestamp?: number
  className?: string
  variant?: 'chat' | 'dashboard' | 'report'
  messageId?: string
  highlightedItems?: string[]
  onDrillDownAction?: (
    action: DrillDownActionType,
    payload: { name: string; dimension?: string }
  ) => void
}

const VizRendererBase = ({
  title,
  subtitle,
  summary,
  hideHeader = false,
  chartType = 'bar',
  chartTitle,
  tableData,
  columnFields = [],
  columns = [],
  columnTypes = {},
  vizConfig,
  className,
  variant = 'chat',
  timestamp,
  messageId,
  highlightedItems,
  onDrillDownAction,
}: VizRendererProps) => {
  const [showSummary, setShowSummary] = useState(false)
  const { t } = useTranslation('common')

  const displayMode = getDisplayMode(chartType, tableData || [], vizConfig)

  if (variant === 'dashboard') {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {!hideHeader && (
          <VizHeader
            title={title}
            subtitle={subtitle}
            className="mb-1 pb-2 flex-shrink-0"
            showTimestamp={false}
            size="sm"
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
        )}

        <div className="flex-1 min-h-0 w-full mb-0 p-2">
          {displayMode === 'chart' && (
            <VizChart
              type={chartType}
              title={chartTitle}
              data={tableData}
              config={vizConfig}
              className="h-full w-full"
              _messageId={messageId}
              highlightedItems={highlightedItems}
              onDrillDownAction={onDrillDownAction}
            />
          )}

          {displayMode === 'bignumber' && (
            <div className="h-full w-full flex items-center justify-center">
              <KpiGrid
                reportData={{ title, chartType, tableData, vizConfig }}
                variant={variant}
                highlightedItems={highlightedItems}
              />
            </div>
          )}

          {displayMode === 'table' && (
            <div className="h-full w-full overflow-auto space-y-4">
              <DataTable
                data={tableData}
                columnFields={columnFields}
                columns={columns}
                columnTypes={columnTypes}
                variant="dashboard"
                highlightedItems={highlightedItems}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', variant !== 'report' && 'h-full', className)}>
      {!hideHeader && (
        <VizHeader
          title={title}
          subtitle={subtitle}
          className="mb-5"
          timestamp={timestamp}
          showTimestamp={false}
        />
      )}

      <div className={cn(
        'flex-1 min-h-0 pr-2',
        variant === 'chat' ? 'overflow-y-auto space-y-6' : 'space-y-4'
      )}>
        {summary && (
          <div className="text-sm text-zinc-600 leading-relaxed mb-4">
            {summary}
          </div>
        )}

        {displayMode === 'chart' && (
          <div className={cn(
            "w-full pb-4 pt-2",
            variant === 'chat' ? "h-[250px]" : "h-full min-h-[300px]"
          )}>
            <VizChart
              type={chartType}
              title={chartTitle}
              data={tableData}
              config={vizConfig}
              className="h-full w-full"
              _messageId={messageId}
              highlightedItems={highlightedItems}
              onDrillDownAction={onDrillDownAction}
            />
          </div>
        )}

        {displayMode === 'bignumber' && (
          <div className="w-full flex items-center justify-center py-4 px-2">
            <KpiGrid
              reportData={{ title, chartType, tableData, vizConfig }}
              variant={variant}
              highlightedItems={highlightedItems}
            />
          </div>
        )}

        {displayMode === 'table' && (
          <div className="w-full overflow-hidden">
            <h4 className="text-sm font-semibold text-zinc-800 mb-2">
              {t('data_detail')}
            </h4>
            <DataTable
              data={tableData}
              columnFields={columnFields}
              columns={columns}
              columnTypes={columnTypes}
              variant={variant}
              highlightedItems={highlightedItems}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export const VizRenderer = React.memo(VizRendererBase, (prev, next) => {
  return (
    prev.chartType === next.chartType &&
    prev.chartTitle === next.chartTitle &&
    prev.title === next.title &&
    prev.variant === next.variant &&
    prev.timestamp === next.timestamp &&
    prev.tableData === next.tableData &&
    JSON.stringify(prev.vizConfig) === JSON.stringify(next.vizConfig) &&
    JSON.stringify(prev.highlightedItems) === JSON.stringify(next.highlightedItems) &&
    prev.onDrillDownAction === next.onDrillDownAction
  )
})
