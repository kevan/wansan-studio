import React, { useMemo } from 'react'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { ReportWidgetContainer } from '../viz/containers/ReportWidgetContainer'
import { ReportSectionHeader, ReportKpiRow } from '../viz/containers/report-widgets'
import { FileText, Calendar, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ReportFlowLayerProps {
  width: number
  scale: number
}

type RenderBlock =
  | { type: 'widget'; data: any }
  | { type: 'section'; title: string; subtitle?: string }
  | { type: 'kpi-row'; items: any[] }

export function ReportFlowLayer({ width, scale }: ReportFlowLayerProps) {
  const { t } = useTranslation('common')
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const canvasConfig = useWorkbenchStore(state => state.canvasConfig)

  // 1. Sort reports by logical order (Page -> Y -> X)
  const sortedReports = useMemo(() => {
    return [...pinnedReports].sort((a, b) => {
      const pageA = a.pageIndex || 0
      const pageB = b.pageIndex || 0
      if (pageA !== pageB) return pageA - pageB

      const layoutA = a.layout || { x: 0, y: 0 }
      const layoutB = b.layout || { x: 0, y: 0 }
      // Row priority, but allow small X variance
      if (Math.abs(layoutA.y - layoutB.y) > 1) return layoutA.y - layoutB.y
      return layoutA.x - layoutB.x
    })
  }, [pinnedReports])

  // 2. Group into Render Blocks
  const blocks = useMemo(() => {
    const result: RenderBlock[] = []
    let kpiBuffer: any[] = []

    const flushKpiBuffer = () => {
      if (kpiBuffer.length > 0) {
        result.push({ type: 'kpi-row', items: [...kpiBuffer] })
        kpiBuffer = []
      }
    }

    sortedReports.forEach(report => {
      const type = report.reportData.chartType

      if (type === 'text') {
        flushKpiBuffer()
        // Convert Text Widget to Section Header
        result.push({
          type: 'section',
          title: report.reportData.title,
          subtitle: report.reportData.content,
        })
      } else if (type === 'kpi') {
        kpiBuffer.push(report)
      } else {
        flushKpiBuffer()
        result.push({ type: 'widget', data: report })
      }
    })
    flushKpiBuffer() // Final flush

    return result
  }, [sortedReports])

  return (
    <div className="w-full min-h-screen bg-zinc-50/50 pb-24 overflow-y-auto">
      {/* 1. Report Cover / Header */}
      <div className="max-w-[1400px] mx-auto pt-12 pb-16 px-6 lg:px-12">
        <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 lg:p-16 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/3 -z-0"></div>

          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-widest">
              <FileText className="w-3 h-3" />
              {t('analysis_report', 'Business Analysis Report')}
            </div>

            <h1 className="text-4xl font-black text-zinc-900 leading-tight tracking-tight">
              {canvasConfig.title || t('default_report_title')}
            </h1>

            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <User className="w-4 h-4" />
                <span className="font-medium">Wansan Studio</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Flow */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {blocks.length > 0 ? (
          blocks.map((block, idx) => {
            if (block.type === 'section') {
              return (
                <ReportSectionHeader
                  key={idx}
                  title={block.title}
                  subtitle={block.subtitle}
                />
              )
            }
            if (block.type === 'kpi-row') {
              return <ReportKpiRow key={idx} reports={block.items} />
            }
            return (
              <ReportWidgetContainer key={block.data.id} report={block.data} />
            )
          })
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