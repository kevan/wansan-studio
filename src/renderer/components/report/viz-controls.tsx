import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Settings2,
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Gauge,
  ArrowUpDown,
  Check,
} from 'lucide-react'
import type { AIAnalysisResult } from '@shared/types'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { adaptChartConfig } from '@/lib/viz-adapter'

type VizType = NonNullable<AIAnalysisResult['visualization']>['type']

interface VizControlsProps {
  vizType?: VizType | 'area' | 'text'
  vizConfig?: {
    x_axis?: string | null
    y_axis?: string | string[] | null
    series_name?: string
  }
  columns?: string[]
  data?: Array<Record<string, any>>
  disabled?: boolean
  onChange: (updates: Partial<AIAnalysisResult['visualization']>) => void
}

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

export function VizControls({
  vizType = 'bar',
  vizConfig,
  columns,
  data,
  disabled = false,
  onChange,
}: VizControlsProps) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation('common')

  const availableColumns = useMemo(() => {
    if (columns && columns.length > 0) return columns
    if (data && data.length > 0) return Object.keys(data[0])
    return []
  }, [columns, data])

  const yAxisValues = useMemo(() => {
    const raw = vizConfig?.y_axis
    if (Array.isArray(raw)) return raw.filter(Boolean) as string[]
    if (typeof raw === 'string' && raw) return [raw]
    return []
  }, [vizConfig?.y_axis])

  const yAxisOptions = useMemo(
    () => availableColumns.filter(col => col !== vizConfig?.x_axis),
    [availableColumns, vizConfig?.x_axis]
  )

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleChartTypeChange = (type: VizType) => {
    // Use adaptChartConfig to intelligently map configuration when switching chart types
    const adapted = adaptChartConfig(type, vizType, vizConfig, data || [])
    onChange(adapted)
  }

  const handleXAxisChange = (value: string) => {
    onChange({
      config: {
        ...(vizConfig || {}),
        x_axis: value || null,
      },
    })
  }

  const handleYAxisToggle = (value: string) => {
    const isSelected = yAxisValues.includes(value)
    const nextY = isSelected
      ? yAxisValues.filter(v => v !== value)
      : [...yAxisValues, value]

    onChange({
      config: {
        ...(vizConfig || {}),
        y_axis: nextY.length > 0 ? nextY : null,
      },
    })
  }

  const handleSwapAxes = () => {
    if (!vizConfig?.x_axis || yAxisValues.length === 0) return
    const nextX = yAxisValues[0]
    const nextY = [vizConfig.x_axis, ...yAxisValues.slice(1)]

    onChange({
      config: {
        ...(vizConfig || {}),
        x_axis: nextX,
        y_axis: nextY,
      },
    })
  }

  const showAxisControls =
    vizType !== 'table' && vizType !== 'kpi' && availableColumns.length > 0

  return (
    <div className="relative hide-on-export">
      <button
        type="button"
        disabled={disabled}
        onClick={e => {
          e.stopPropagation()
          setOpen(prev => !prev)
        }}
        onMouseDown={e => e.stopPropagation()}
        className={cn(
          'p-1.5 rounded-md transition-colors hover:bg-zinc-200 text-zinc-500',
          disabled && 'cursor-not-allowed opacity-60'
        )}
        title={t('edit_viz')}
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="fixed z-[100] w-80 bg-white rounded-lg shadow-xl border border-zinc-200"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-500 flex items-center justify-between">
            {t('visualization')}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-2">
                {t('chart_type')}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {chartTypeOptions.map(option => {
                  const Icon = option.icon
                  const isActive = vizType === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChartTypeChange(option.value)}
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

            {showAxisControls && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="font-medium text-zinc-600">{t('axes')}</span>
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
                    value={vizConfig?.x_axis ?? ''}
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
      )}
    </div>
  )
}
