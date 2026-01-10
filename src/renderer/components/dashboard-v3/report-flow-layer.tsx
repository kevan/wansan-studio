import React, { useMemo } from 'react'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { ReportWidgetContainer } from '../viz/containers/ReportWidgetContainer'
import { ReportSectionHeader, ReportKpiRow } from '../viz/containers/report-widgets'
import { FileText, Calendar, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface ReportFlowLayerProps {
  width: number
  scale: number
}

type RenderBlock =
  | { type: 'widget'; data: any }
  | { type: 'section'; data: any }
  | { type: 'kpi-row'; items: any[] }

type SectionGroup = {
  id: string
  header?: any
  items: RenderBlock[]
}

export function ReportFlowLayer({ width, scale }: ReportFlowLayerProps) {
  const { t } = useTranslation('common')
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const canvasConfig = useWorkbenchStore(state => state.canvasConfig)

  // 1. Sort reports by logical order (Page -> Y -> X)
  const sortedReports = useMemo(() => {
    return [...pinnedReports].sort((a, b) => {
      const pageA = a.pageIndex || 0
      const pageB = b.pageIndex || 0
      if (pageA !== pageB) return pageA - pageB

      const layoutA = a.layout || { x: 0, y: 0 }
      const layoutB = b.layout || { x: 0, y: 0 }
      if (Math.abs(layoutA.y - layoutB.y) > 1) return layoutA.y - layoutB.y
      return layoutA.x - layoutB.x
    })
  }, [pinnedReports])

  // 2. Group into Sections
  const groups = useMemo(() => {
    const result: SectionGroup[] = []
    let currentGroup: SectionGroup = { id: 'default', items: [] }
    
    let kpiBuffer: any[] = []
    const flushKpiBuffer = () => {
      if (kpiBuffer.length > 0) {
        currentGroup.items.push({ type: 'kpi-row', items: [...kpiBuffer] })
        kpiBuffer = []
      }
    }

    sortedReports.forEach(report => {
      const type = report.reportData.chartType
      const data = report.reportData.tableData || []
      const yAxes = Array.isArray(report.reportData.vizConfig?.y_axis) 
        ? report.reportData.vizConfig.y_axis 
        : [report.reportData.vizConfig?.y_axis].filter(Boolean)

      // A KPI is "combinable" only if it has 1 row and 1 metric.
      // Otherwise, it needs its own space to expand into a grid.
      const isSimpleKpi = type === 'kpi' && data.length <= 1 && yAxes.length <= 1

      if (type === 'text') {
        flushKpiBuffer()
        // Push the completed group before starting a new one
        if (currentGroup.items.length > 0 || currentGroup.header) {
          result.push(currentGroup)
        }
        currentGroup = {
          id: report.id,
          header: report,
          items: [],
        }
      } else if (isSimpleKpi) {
        kpiBuffer.push(report)
      } else {
        flushKpiBuffer()
        currentGroup.items.push({ type: 'widget', data: report })
      }
    })
    flushKpiBuffer()
    result.push(currentGroup)

    return result
  }, [sortedReports])

  return (
    <div className="w-full min-h-screen bg-[#fbfbfa] pb-24 overflow-y-auto">
      {/* 1. Report Cover (Compacted) */}
      <div className="max-w-[1200px] mx-auto pt-8 pb-8 px-6">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 lg:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/3 -z-0"></div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <FileText className="w-3 h-3" />
              {t('analysis_report', 'Business Analysis Report')}
            </div>

            <h1 className="text-3xl lg:text-4xl font-black text-zinc-900 leading-tight tracking-tight">
              {canvasConfig.title || t('default_report_title')}
            </h1>

            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium">Wansan Studio</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Flow (Streamlined) */}
      <div className="w-full">
        {groups.some(g => g.items.length > 0 || g.header) ? (
          groups.map((group) => (
            <div 
                key={group.id} 
                className="py-8 border-b border-zinc-100 last:border-0"
            >
                <div className="max-w-[1200px] mx-auto px-6">
                    {group.header && (
                        <ReportSectionHeader
                            report={group.header}
                            onRemove={() => removeReport(group.header.id)}
                        />
                    )}
                    
                    <div className="space-y-8">
                        {group.items.map((block, idx) => {
                            if (block.type === 'kpi-row') {
                                return <ReportKpiRow key={`${group.id}-kpi-${idx}`} reports={block.items} />
                            }
                            if (block.type === 'widget') {
                                return (
                                    <ReportWidgetContainer 
                                        key={block.data.id} 
                                        report={block.data} 
                                        onRemove={() => removeReport(block.data.id)}
                                    />
                                )
                            }
                            return null
                        })}
                    </div>
                </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center">
            <div className="inline-flex p-4 bg-zinc-100 rounded-full mb-4">
              <FileText className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-500">
              {t(
                'no_pinned_reports',
                'Add charts to your dashboard to build a report.'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}