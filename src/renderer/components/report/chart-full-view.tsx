import React, { useEffect, useMemo, useState } from 'react'
import {
  X,
  Save,
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Gauge,
  ArrowUpDown,
  Check,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { useWorkbenchStore } from '@/stores/useWorkbenchStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { A4Chart } from '../A4Canvas'
import { ReportTable } from './report-table'
import { BigNumberDisplay } from '../BigNumberDisplay'
import { cn } from '@/utils/cn'
import type {
  ReportData,
  DenormalizedReportWidget,
} from '@/stores/useWorkbenchStore'
import { useTranslation } from 'react-i18next'
import { adaptChartConfig } from '@/lib/viz-adapter'
import type { AIAnalysisResult } from '@shared/types'
import { getDisplayMode } from '@/utils/viz-logic'

type VizType = NonNullable<AIAnalysisResult['viz_type']>

const chartTypeOptions: Array<{
  value: VizType
  label: string
  icon: React.ComponentType<any>
}> = [
  { value: 'bar', label: 'chart_bar', icon: BarChart3 },
  { value: 'line', label: 'chart_line', icon: LineChart },
  { value: 'pie', label: 'chart_pie', icon: PieChart },
  { value: 'table', label: 'chart_table', icon: Table2 },
  { value: 'kpi', label: 'chart_kpi', icon: Gauge },
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
  const { t } = useTranslation('common')

  const report = useMemo(() => {
    // 1. Check pinned
    const pinned = pinnedReports.find(r => r.id === editingReportId)
    if (pinned) return pinned

    // 2. Check registry (Unpinned)
    if (editingReportId && widgetRegistry[editingReportId]) {
      return {
        id: editingReportId, // Use registry ID as ID
        widgetId: editingReportId,
        reportData: widgetRegistry[editingReportId],
        layout: { i: editingReportId, x: 0, y: 0, w: 0, h: 0 },
        pageIndex: 0,
        sourceMessageId: '',
      } as DenormalizedReportWidget
    }
    return undefined
  }, [editingReportId, pinnedReports, widgetRegistry])

  const [localType, setLocalType] = useState<ReportData['chartType']>('bar')
  const [localConfig, setLocalConfig] = useState<
    ReportData['vizConfig'] | undefined
  >(undefined)
  const [localTitle, setLocalTitle] = useState('')

  useEffect(() => {
    if (!report) return
    setLocalType(report.reportData.chartType ?? 'bar')
    setLocalConfig(report.reportData.vizConfig)
    setLocalTitle(report.reportData.title ?? '')
  }, [report])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditingReportId(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [setEditingReportId])

  // --- Safe Data Extraction for Hooks ---
  const data = report?.reportData.tableData || []
  const columnFields = report?.reportData.columnFields || []
  const legacyColumns = report?.reportData.columns || []
  const legacyColumnTypes = report?.reportData.columnTypes || {}

  const columns =
    (columnFields.length > 0
      ? columnFields.map(f => f.name)
      : legacyColumns.length > 0
        ? legacyColumns
        : data[0]
          ? Object.keys(data[0])
          : []) || []

  // --- Inline Viz Controls Logic (Hooks must be unconditional) ---

  const availableColumns = columns

  const yAxisValues = useMemo(() => {
    const raw = localConfig?.y_axis
    if (Array.isArray(raw)) return raw.filter(Boolean) as string[]
    if (typeof raw === 'string' && raw) return [raw]
    return []
  }, [localConfig?.y_axis])

  const yAxisOptions = useMemo(
    () => availableColumns.filter(col => col !== localConfig?.x_axis),
    [availableColumns, localConfig?.x_axis]
  )

  const effectiveType = localType ?? report?.reportData.chartType ?? 'bar'

  const handleChartTypeChange = (type: VizType) => {
    const adapted = adaptChartConfig(
      type,
      effectiveType as VizType,
      localConfig,
      data || []
    )
    setLocalType(adapted.type as any)
    setLocalConfig(prev => ({ ...(prev || {}), ...adapted.config }))
  }

  const handleXAxisChange = (value: string) => {
    setLocalConfig(prev => ({
      ...(prev || {}),
      x_axis: value || null,
    }))
  }

  const handleYAxisToggle = (value: string) => {
    const isSelected = yAxisValues.includes(value)
    const nextY = isSelected
      ? yAxisValues.filter(v => v !== value)
      : [...yAxisValues, value]

    setLocalConfig(prev => ({
      ...(prev || {}),
      y_axis: nextY.length > 0 ? nextY : null,
    }))
  }

  const handleSwapAxes = () => {
    if (!localConfig?.x_axis || yAxisValues.length === 0) return
    const nextX = yAxisValues[0]
    const nextY = [localConfig.x_axis, ...yAxisValues.slice(1)]

    setLocalConfig(prev => ({
      ...(prev || {}),
      x_axis: nextX,
      y_axis: nextY,
    }))
  }

  const handleSave = () => {
    if (!report) return
    updateReportConfig(report.id, {
      type: effectiveType as any,
      config: localConfig,
    })
    if (localTitle.trim() && localTitle !== report.reportData.title) {
      updateReportTitle(report.id, localTitle.trim())
    }
    setEditingReportId(null)
  }

  const displayMode = getDisplayMode(effectiveType, data, localConfig)

  const showAxisControls =
    displayMode === 'chart' && availableColumns.length > 0

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div
        className={cn(
          'relative flex h-[80vh] w-[80vw] max-w-[95vw] rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden transition-all duration-300'
        )}
      >
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
            <input
              className="w-full max-w-lg border-none text-lg font-semibold text-zinc-900 outline-none focus:ring-0"
              value={localTitle}
              onChange={e => setLocalTitle(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingReportId(null)}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
                {t('close')}
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                <Save className="h-4 w-4" />
                {t('save')}
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-5 min-w-0">
              <div className="h-full w-full rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
                {displayMode === 'bignumber' && data.length > 0 && (
                  <BigNumberDisplay
                    value={
                      (() => {
                        const yCol = Array.isArray(localConfig?.y_axis)
                          ? localConfig.y_axis[0]
                          : localConfig?.y_axis
                        const targetCol = yCol || Object.keys(data[0])[0]
                        return data[0][targetCol]
                      })() as any
                    }
                    label={(() => {
                      const yCol = Array.isArray(localConfig?.y_axis)
                        ? localConfig.y_axis[0]
                        : localConfig?.y_axis
                      return yCol || Object.keys(data[0])[0]
                    })()}
                    variant="dashboard"
                  />
                )}

                {displayMode === 'chart' && (
                  <A4Chart
                    type={effectiveType}
                    title={localTitle}
                    data={data}
                    config={localConfig}
                    className="h-full w-full"
                  />
                )}

                {displayMode === 'table' && (
                  <div className="h-full w-full overflow-auto">
                    <ReportTable
                      data={data}
                      columnFields={columnFields}
                      columns={legacyColumns}
                      columnTypes={legacyColumnTypes}
                      variant="dashboard"
                    />
                  </div>
                )}

                {displayMode === 'empty' && (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    {t('no_data')}
                  </div>
                )}
              </div>
            </div>

            <div
              className={cn(
                'w-[320px] border-l border-zinc-200 bg-white p-4 overflow-y-auto shrink-0'
              )}
            >
              <div className="mb-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {t('visualization')}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-zinc-500 mb-2">
                    {t('chart_type')}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {chartTypeOptions.map(option => {
                      const Icon = option.icon
                      const isActive = effectiveType === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            handleChartTypeChange(option.value as VizType)
                          }
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[11px] font-medium transition-colors',
                            isActive
                              ? 'border-orange-200 bg-orange-50 text-orange-700'
                              : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {t(option.label)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {displayMode === 'bignumber' && (
                  <div className="space-y-3">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                      {t('value_column', 'Value Column')}
                    </div>
                    <select
                      value={(() => {
                        const yVal = localConfig?.y_axis
                        return Array.isArray(yVal) ? yVal[0] : yVal || ''
                      })()}
                      onChange={e => {
                        const val = e.target.value
                        setLocalConfig(prev => ({
                          ...(prev || {}),
                          y_axis: val ? [val] : null,
                        }))
                      }}
                      className="w-full rounded-md border border-zinc-200 px-2 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    >
                      {availableColumns.map(col => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {showAxisControls && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="font-medium text-zinc-600">
                        {t('axes')}
                      </span>
                      <button
                        type="button"
                        onClick={handleSwapAxes}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        {t('swap')}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                        {t('x_axis')}
                      </div>
                      <select
                        value={localConfig?.x_axis ?? ''}
                        onChange={e => handleXAxisChange(e.target.value)}
                        className="w-full rounded-md border border-zinc-200 px-2 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-200"
                      >
                        <option value="">{t('select_column')}</option>
                        {availableColumns.map(col => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                        {t('y_axis')}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {yAxisOptions.map(col => {
                          const isSelected = yAxisValues.includes(col)
                          return (
                            <button
                              key={col}
                              type="button"
                              onClick={() => handleYAxisToggle(col)}
                              className={cn(
                                'flex items-center gap-1 rounded-full border px-2 py-1.5 text-xs font-medium transition-colors',
                                isSelected
                                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                              )}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              {col}
                            </button>
                          )
                        })}
                        {yAxisOptions.length === 0 && (
                          <span className="text-xs text-zinc-400">
                            {t('select_x_first')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (!editingReportId) return null
  if (!report) {
    // console.error('Report not found for editing id:', editingReportId)
    return null
  }
  if (typeof window === 'undefined') {
    return null
  }

  return createPortal(content, document.body)
}
