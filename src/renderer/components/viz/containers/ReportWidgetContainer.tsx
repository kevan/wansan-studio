import React, { useState } from 'react'
import { VizRenderer } from '../core/VizRenderer'
import { TitleWidget } from '../base/TitleWidget'
import { InsightPanel } from '../InsightPanel'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, FileText, ChevronRight } from 'lucide-react'

interface ReportWidgetContainerProps {
  report: any
  className?: string
}

export function ReportWidgetContainer({
  report,
  className,
}: ReportWidgetContainerProps) {
  const { t } = useTranslation('common')
  const reportData = report.reportData
  const reportConfig = report.reportConfig || { layoutType: 'flow', showInsight: true }
  const isTextWidget = reportData.chartType === 'text'
  const [highlightedItems, setHighlightedItems] = useState<string[]>([])

  const isSplit = reportConfig.layoutType === 'split'

  if (isTextWidget) {
    return (
      <div className={cn('mb-12 px-2', className)}>
        <TitleWidget
          id={report.id}
          content={reportData.content || ''}
          readOnly={true}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex flex-col gap-6 mb-20 pb-12 border-b border-zinc-100 last:border-0',
        className
      )}
    >
      {/* 1. Header: Section Style */}
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
        <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
          {reportData.title || t('untitled_chart')}
        </h2>
      </div>

      {/* 2. Content Layout */}
      <div
        className={cn(
          'flex flex-col gap-8',
          isSplit ? 'lg:flex-row lg:items-start lg:gap-12' : 'max-w-4xl mx-auto w-full'
        )}
      >
        {/* 2.1 Visual Area */}
        <div className={cn(
            'flex-1 min-w-0 bg-white border border-zinc-100 rounded-2xl p-6 lg:p-8 shadow-sm',
            !isSplit && 'w-full'
        )}>
          <VizRenderer
            {...reportData}
            variant="dashboard"
            highlightedItems={highlightedItems}
            className="min-h-[400px]"
          />
        </div>

        {/* 2.2 Insight Area (Always visible and expanded in Report Mode) */}
        {reportData.insight && reportConfig.showInsight !== false && (
          <div className={cn(
              'shrink-0',
              isSplit ? 'w-full lg:w-[450px]' : 'w-full mt-4'
          )}>
            <div className={cn(
                'bg-indigo-50/20 border border-indigo-100/40 rounded-3xl p-6 lg:p-8',
                !isSplit && 'bg-white/50 border-dashed'
            )}>
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <FileText className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {t('ai_insight')}
                </span>
              </div>
              <InsightPanel
                title={reportData.title}
                chartType={reportData.chartType}
                chartData={reportData.tableData || []}
                insight={reportData.insight}
                onGenerateInsight={async () => ''} // Read-only in report
                defaultExpanded={true}
                onHighlight={setHighlightedItems}
                className="bg-transparent border-0 p-0 shadow-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
