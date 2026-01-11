import React, { useState } from 'react'
import { VizRenderer } from '../core/VizRenderer'
import { ReportTitleEditor } from '../base/ReportTitleEditor'
import { InsightPanel } from '../InsightPanel'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { Columns, Rows, X } from 'lucide-react'
import { useProjectStore } from '@/stores/useProjectStore'

interface ReportWidgetContainerProps {
  report: any
  className?: string
  onRemove?: () => void
  readOnly?: boolean
}

export function ReportWidgetContainer({
  report,
  className,
  onRemove,
  readOnly,
}: ReportWidgetContainerProps) {
  const { t } = useTranslation('common')
  const updateWidget = useProjectStore(state => state.updateWidget)
  
  const reportData = report.reportData
  const reportConfig = report.reportConfig || { layoutType: 'flow', showInsight: true }
  const isTextWidget = reportData.chartType === 'text'
  const [highlightedItems, setHighlightedItems] = useState<string[]>([])

  // Local state for layout to support "Export/ReadOnly" mode (where updateWidget might not persist or exist)
  const [layoutType, setLayoutType] = useState<'flow' | 'split'>(reportConfig.layoutType || 'flow')
  const isSplit = layoutType === 'split'

  // Skip system title widgets (usually the first one) to avoid duplication with Report Cover
  if (isTextWidget && report.sourceMessageId === 'system') {
      return null
  }

  const toggleLayout = () => {
      const next = isSplit ? 'flow' : 'split'
      setLayoutType(next)
      
      // Attempt to persist if not read-only (and function exists)
      if (!readOnly && updateWidget) {
          updateWidget(report.id, {
              reportConfig: {
                  ...reportConfig,
                  layoutType: next
              }
          })
      }
  }

  if (isTextWidget) {
    return (
      <div className={cn('mb-2 px-2', className)}>
        <ReportTitleEditor
          id={report.id}
          content={reportData.content || ''}
          readOnly={true}
          className="text-lg leading-relaxed text-zinc-700 font-medium"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 mb-4 pb-4 border-b border-zinc-100 last:border-0',
        className
      )}
    >
      {/* 1. Header: Section Style + Controls */}
      <div className="flex items-center justify-between group/header">
        <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-zinc-800 tracking-tight">
            {reportData.title || t('untitled_chart')}
            </h2>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover/header:opacity-100 transition-opacity">
            {/* Inline Layout Switcher */}
            <button 
                onClick={toggleLayout}
                className="p-2 text-zinc-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                title={isSplit ? t('layout_flow') : t('layout_split')}
            >
                {isSplit ? <Rows className="w-4 h-4" /> : <Columns className="w-4 h-4" />}
            </button>
            
            {/* Remove Button */}
            {onRemove && !readOnly && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title={t('remove_from_dashboard')}
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>

      {/* 2. Content Layout: Unified Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div
          className={cn(
            'grid',
            isSplit
              ? 'grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100'
              : 'grid-cols-1 divide-y divide-zinc-100'
          )}
        >
          {/* 2.1 Visual Area */}
          <div className="p-6 lg:p-8 flex flex-col justify-center">
            <VizRenderer
              {...reportData}
              hideHeader={true}
              variant="dashboard"
              highlightedItems={highlightedItems}
              className={cn(
                'w-full',
                isSplit ? 'aspect-video min-h-[400px]' : 'h-[400px]'
              )}
            />
          </div>

          {/* 2.2 Insight Area */}
          {reportData.insight && reportConfig.showInsight !== false && (
            <div className="p-6 lg:p-8 bg-zinc-50/30 flex flex-col justify-center">
              <InsightPanel
                title={reportData.title}
                chartType={reportData.chartType}
                chartData={reportData.tableData || []}
                insight={reportData.insight}
                onGenerateInsight={async () => ''}
                defaultExpanded={true}
                onHighlight={setHighlightedItems}
                className="bg-transparent border-0 p-0 shadow-none"
                readOnly={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
