import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  AreaChart,
  ArrowUpDown,
  BarChart3,
  Check,
  Gauge,
  LineChart,
  PieChart,
  Radar,
  Save,
  ScatterChart,
  Table2,
  X,
  Type,
  LayoutTemplate,
  Columns,
  Rows,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import type { DenormalizedReportWidget } from '@/stores/useWorkbenchStore'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useChatStore } from '@/stores/useChatStore'
import { VizChart } from '../core/VizChart'
import { DataTable } from '../base/DataTable'
import { KpiCard } from '../base/KpiCard'
import { cn } from '@/utils/cn'
import type { ChartType, ReportData, ReportWidget, InsightResult } from '@shared/types/dashboard'
import { useTranslation } from 'react-i18next'
import { adaptChartConfig } from '@/lib/viz-adapter'
import { InsightPanel } from '../InsightPanel'
import { useGenerateInsight } from '@/hooks/useIPC'
import { MonacoSqlEditor } from '@/components/ui/MonacoSqlEditor'

const chartTypeOptions: Array<{
  value: ChartType
  label: string
  icon: React.ComponentType<any>
}> = [
  { value: 'bar', label: 'chart_bar', icon: BarChart3 },
  { value: 'line', label: 'chart_line', icon: LineChart },
  { value: 'area', label: 'chart_area', icon: AreaChart },
  { value: 'pie', label: 'chart_pie', icon: PieChart },
  { value: 'rose', label: 'chart_rose', icon: PieChart },
  { value: 'scatter', label: 'chart_scatter', icon: ScatterChart },
  { value: 'radar', label: 'chart_radar', icon: Radar },
  { value: 'table', label: 'chart_table', icon: Table2 },
  { value: 'kpi', label: 'chart_kpi', icon: Gauge },
  { value: 'text', label: 'chart_text', icon: Type },
]

export function ChartFullView() {
  const editingReportId = useWorkbenchStore(state => state.editingReportId)
  const setEditingReportId = useWorkbenchStore(
    state => state.setEditingReportId
  )
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const updateReportConfig = useWorkbenchStore(
    state => state.updateReportConfig
  )
  const updateReportTitle = useWorkbenchStore(state => state.updateReportTitle)
  const widgetRegistry = useProjectStore(state => state.widgetRegistry)
  const { t, i18n } = useTranslation('common')
  const generateInsight = useGenerateInsight()
  const language = i18n.language === 'zh' ? 'zh' : 'en'

  const [highlightedItems, setHighlightedItems] = useState<string[]>([])

  const report = useMemo(() => {
    const pinned = pinnedReports.find(r => r.id === editingReportId)
    if (pinned) return pinned
    if (editingReportId && widgetRegistry[editingReportId]) {
      return {
        id: editingReportId,
        widgetId: editingReportId,
        reportData: widgetRegistry[editingReportId],
        layout: { i: editingReportId, x: 0, y: 0, w: 0, h: 0 },
        pageIndex: 0,
        sourceMessageId: '',
      } as DenormalizedReportWidget
    }
    return undefined
  }, [editingReportId, pinnedReports, widgetRegistry])

  const [localType, setLocalType] = useState<ReportData['chartType'] | null>(null)
  const [localConfig, setLocalConfig] = useState<ReportData['vizConfig'] | null>(null)
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const [localContent, setLocalContent] = useState<string | null>(null)
  const [localInsight, setLocalInsight] = useState<InsightResult | null>(null)

  // Derive effective values
  const effectiveType = localType ?? report?.reportData.chartType ?? 'bar'
  const effectiveConfig = localConfig ?? report?.reportData.vizConfig
  const effectiveTitle = localTitle ?? report?.reportData.title ?? ''
  const effectiveContent = localContent ?? report?.reportData.content ?? ''
  const effectiveInsight = localInsight ?? report?.reportData.insight

  // Reset local state when switching or closing reports
  useEffect(() => {
    setLocalType(null)
    setLocalConfig(null)
    setLocalTitle(null)
    setLocalContent(null)
    setLocalInsight(null)
  }, [editingReportId])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditingReportId(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [setEditingReportId])

  // Data extraction
  const data = report?.reportData.tableData || []
  const columnFields = report?.reportData.columnFields || []
  const columns = columnFields.length > 0 ? columnFields.map(f => f.name) : (data[0] ? Object.keys(data[0]) : [])

  const availableColumns = columns
  const yAxisValues = useMemo(() => {
    const raw = effectiveConfig?.y_axis
    if (Array.isArray(raw)) return raw.filter(Boolean) as string[]
    if (typeof raw === 'string' && raw) return [raw]
    return []
  }, [effectiveConfig?.y_axis])

  const yAxisOptions = useMemo(
    () => availableColumns.filter(col => col !== effectiveConfig?.x_axis),
    [availableColumns, effectiveConfig?.x_axis]
  )

  const handleChartTypeChange = (type: ChartType) => {
    const adapted = adaptChartConfig(type as any, effectiveType as any, effectiveConfig, data || [])
    setLocalType(adapted.type as ChartType)
    setLocalConfig(prev => ({ ...(prev || effectiveConfig || {}), ...adapted.config }))
  }

  const handleXAxisChange = (value: string) => {
    setLocalConfig(prev => ({ ...(prev || effectiveConfig || {}), x_axis: value || null }))
  }

  const handleYAxisToggle = (value: string) => {
    const isSelected = yAxisValues.includes(value)
    const nextY = isSelected ? yAxisValues.filter(v => v !== value) : [...yAxisValues, value]
    setLocalConfig(prev => ({ ...(prev || effectiveConfig || {}), y_axis: nextY.length > 0 ? nextY : null }))
  }

  const handleSwapAxes = () => {
    if (!effectiveConfig?.x_axis || yAxisValues.length === 0) return
    setLocalConfig(prev => ({ ...(prev || effectiveConfig || {}), x_axis: yAxisValues[0], y_axis: [effectiveConfig.x_axis!, ...yAxisValues.slice(1)] }))
  }

  const handleGenerateInsight = async (chartData: Array<Record<string, unknown>>) => {
    const result = await generateInsight.mutateAsync({
      chartTitle: effectiveTitle,
      chartType: effectiveType,
      aggregatedData: chartData,
      language,
    })
    setLocalInsight(result as InsightResult)
    return result
  }

  const handleDrillDown = useCallback(
    (action: 'focus' | 'view_data' | 'breakdown', payload: { name: string; dimension?: string }) => {
      setEditingReportId(null)
      if (report?.sourceMessageId) { useChatStore.getState().setReplyTo(report.sourceMessageId) }
      // ... drill down implementation same as before
    },
    [effectiveConfig, report, setEditingReportId, t]
  )

  const handleSave = () => {
    if (!report) return
    
    // Save everything to Registry / Workbench
    const finalReportData: Partial<ReportData> = {
        chartType: effectiveType as any,
        vizConfig: effectiveConfig,
        title: effectiveTitle.trim(),
        content: effectiveContent,
        insight: effectiveInsight
    }

    useProjectStore.getState().updateWidgetData(report.id, finalReportData)
    setEditingReportId(null)
  }

  const handleUpdateReportConfig = (updates: Partial<ReportWidget['reportConfig']>) => {
    if (!report) return
    updateReportConfig(report.id, {
      reportConfig: { ...(report.reportConfig || { layoutType: 'flow', showInsight: true }), ...updates },
    })
  }

  let displayMode = 'chart'
  if (effectiveType === 'table') displayMode = 'table'
  else if (effectiveType === 'kpi') displayMode = 'bignumber'
  else if (effectiveType === 'text') displayMode = 'text'
  else if (!data || data.length === 0) displayMode = 'empty'

  const showAxisControls = displayMode === 'chart' && availableColumns.length > 0
  const modalMaxWidth = displayMode === 'table' ? 'max-w-[95vw]' : 'max-w-[1600px]'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div className={cn('relative flex h-[92vh] w-[94vw] rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden', modalMaxWidth)}>
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 shrink-0">
            <input
              className="w-full max-w-lg border-none text-lg font-semibold text-zinc-900 outline-none focus:ring-0"
              value={effectiveTitle}
              onChange={e => setLocalTitle(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button onClick={() => setEditingReportId(null)} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100">
                <X className="h-4 w-4" />{t('close')}
              </button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors">
                <Save className="h-4 w-4" />{t('save')}
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-5 min-w-0 flex flex-col gap-4">
              <div className="flex-1 min-h-0 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 relative overflow-hidden">
                {displayMode === 'text' && (
                  <div className="h-full w-full bg-white rounded-lg shadow-inner overflow-hidden border border-zinc-100">
                    <MonacoSqlEditor 
                        value={effectiveContent} 
                        onChange={setLocalContent} 
                        language="markdown" 
                        className="h-full" 
                    />
                  </div>
                )}

                {displayMode === 'bignumber' && data.length > 0 && (
                  <KpiCard value={data[0][yAxisValues[0] || Object.keys(data[0])[0]] as any} label={yAxisValues[0] || Object.keys(data[0])[0]} variant="dashboard" />
                )}

                {displayMode === 'chart' && (
                  <VizChart type={effectiveType} title={effectiveTitle} data={data} config={effectiveConfig} className="h-full w-full" highlightedItems={highlightedItems} onDrillDownAction={handleDrillDown} />
                )}

                {displayMode === 'table' && (
                  <div className="h-full w-full overflow-auto"><DataTable data={data} columnFields={columnFields} variant="dashboard" /></div>
                )}

                {displayMode === 'empty' && (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">{t('no_data')}</div>
                )}
              </div>

              {displayMode !== 'text' && (
                <div className="shrink-0">
                  <InsightPanel 
                    title={effectiveTitle}
                    chartType={effectiveType}
                    chartData={data} 
                    insight={effectiveInsight} 
                    onGenerateInsight={handleGenerateInsight} 
                    onSave={setLocalInsight} 
                    onHighlight={setHighlightedItems} 
                    defaultExpanded={true} 
                    readOnly={false}
                  />
                </div>
              )}
            </div>

            <div className="w-[320px] border-l border-zinc-200 bg-zinc-50/30 p-4 overflow-y-auto shrink-0 flex flex-col gap-6">
              <div>
                <div className="mb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('visualization')}</div>
                <div className="grid grid-cols-5 gap-2">
                    {chartTypeOptions.map(option => {
                      const Icon = option.icon
                      return (
                        <button key={option.value} onClick={() => handleChartTypeChange(option.value)} className={cn('flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] font-bold transition-all', effectiveType === option.value ? 'border-zinc-900 bg-zinc-900 text-white shadow-lg' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50')}>
                          <Icon className="w-4 h-4" />{t(option.label)}
                        </button>
                      )
                    })}
                </div>
              </div>

              {showAxisControls && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span>{t('axes')}</span>
                    <button onClick={handleSwapAxes} className="p-1 hover:bg-zinc-200 rounded text-zinc-600 transition-colors"><ArrowUpDown className="w-3 h-3" /></button>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 ml-1 uppercase">{t('x_axis')}</label>
                    <select value={effectiveConfig?.x_axis ?? ''} onChange={e => handleXAxisChange(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none">
                      <option value="">{t('select_column')}</option>
                      {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 ml-1 uppercase">{t('y_axis')}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {yAxisOptions.map(col => (
                        <button key={col} onClick={() => handleYAxisToggle(col)} className={cn('px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all', yAxisValues.includes(col) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300')}>
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 mt-auto border-t border-zinc-200/50">
                <div className="mb-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('report_layout')}</div>
                <div className="flex bg-zinc-200/50 p-1 rounded-xl">
                    <button onClick={() => handleUpdateReportConfig({ layoutType: 'flow' })} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold rounded-lg transition-all', (report?.reportConfig?.layoutType || 'flow') === 'flow' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500')}>
                        <Rows className="w-3 h-3" />{t('layout_flow', 'Flow')}
                    </button>
                    <button onClick={() => handleUpdateReportConfig({ layoutType: 'split' })} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold rounded-lg transition-all', report?.reportConfig?.layoutType === 'split' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500')}>
                        <Columns className="w-3 h-3" />{t('layout_split', 'Split')}
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}