import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Edit2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { ReportChart } from './report/ReportChart'
import { DrillDownMenu } from './visualizations/drill-down-menu'
import { useChatStore } from '../stores/useChatStore'

// A4 画布的各个区域组件
interface A4HeaderProps {
  title: string
  subtitle?: string
  logo?: string
  timestamp?: number
  className?: string
  onTitleChange?: (newTitle: string) => void
  isEditable?: boolean
  showTimestamp?: boolean
  actions?: React.ReactNode
}

export function A4Header({
  title,
  subtitle,
  logo,
  timestamp = Date.now(),
  className = '',
  onTitleChange,
  isEditable = false,
  showTimestamp = true,
  actions,
}: A4HeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const { t } = useTranslation('common')

  useEffect(() => {
    setEditTitle(title)
  }, [title])

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle !== title && onTitleChange) {
      onTitleChange(editTitle.trim())
    }
    setIsEditing(false)
  }

  return (
    <header className={`border-b border-gray-200 pb-4 mb-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={e => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="text-2xl font-bold text-gray-900 mb-1 w-full border-b border-orange-500 focus:outline-none bg-transparent"
            />
          ) : (
            <h1
              className={`text-2xl font-bold text-gray-900 mb-1 group flex items-center gap-2 ${isEditable ? 'cursor-pointer hover:text-orange-600' : ''}`}
              onClick={() => isEditable && setIsEditing(true)}
              title={isEditable ? t('edit_title_tooltip') : undefined}
            >
              {title}
              {isEditable && (
                <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </h1>
          )}
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          {actions}
          {logo && (
            <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
          )}
          {showTimestamp && (
            <div className="text-right text-sm text-gray-500">
              <div>{t('generated_time')}</div>
              <div className="font-mono">
                {new Date(timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// 数据摘要组件
interface A4SummaryProps {
  content: string
  insights?: string[]
  className?: string
}

export function A4Summary({
  content,
  insights,
  className = '',
}: A4SummaryProps) {
  const { t } = useTranslation('common')
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <div className="text-gray-700 leading-relaxed mb-4">{content}</div>

      {insights && insights.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r">
          <h4 className="text-sm font-semibold text-orange-800 mb-2">
            💡 {t('insights')}
          </h4>
          <ul className="text-sm text-orange-700 space-y-1">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ... (previous imports)

// 图表组件
interface A4ChartProps {
  type?: 'bar' | 'line' | 'pie' | 'area' | 'table' | 'scatter' | 'kpi' | 'text' // Added 'table' to be safe, though handled in parent
  title?: string
  data?: Array<Record<string, any>>
  config?: {
    x_axis?: string | null
    y_axis?: string | string[] | null
    series_name?: string
  }
  className?: string
  style?: React.CSSProperties
}

export function A4Chart({
  type = 'bar',
  title = '数据图表',
  data = [],
  config,
  className = '',
  style,
}: A4ChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { t } = useTranslation('common')

  const [menuState, setMenuState] = useState<{
    visible: boolean
    x: number
    y: number
    name: string
    seriesName?: string
  } | null>(null)

  const handleChartClick = (params: any) => {
    if (params && params.event && params.event.event) {
      const { clientX, clientY } = params.event.event
      setMenuState({
        visible: true,
        x: clientX,
        y: clientY,
        name: params.name,
        seriesName: params.seriesName,
      })
    }
  }

  const handleFocus = () => {
    if (!menuState) return
    const query = `Filter the analysis by ${menuState.name}`
    useChatStore.getState().sendMessage(query)
    setMenuState(null)
  }

  const handleViewData = () => {
    if (!menuState) return
    const query = `Show the first 20 raw data rows for '${menuState.name}'`
    useChatStore.getState().sendMessage(query)
    setMenuState(null)
  }

  useEffect(() => {
    const handler = () => requestAnimationFrame(() => {})
    window.addEventListener('dashboard:layout-changed', handler)
    return () => {
      window.removeEventListener('dashboard:layout-changed', handler)
    }
  }, [])

  const x_axis = config?.x_axis
  const y_axis = config?.y_axis
  const { series_name } = config || {}
  const yAxes = Array.isArray(y_axis)
    ? y_axis.filter(Boolean)
    : y_axis
      ? [y_axis]
      : []

  const hasData = Array.isArray(data) && data.length > 0
  const hasAxes = !!x_axis && yAxes.length > 0
  const isRenderable = hasData && hasAxes && type !== 'table' && type !== 'kpi'

  const option = useMemo(() => {
    if (!isRenderable || !x_axis || yAxes.length === 0) {
      return {}
    }

    const xData = data.map(item => item[x_axis])

    const baseSeries =
      type === 'scatter'
        ? yAxes.map(key => ({
            name: series_name || key,
            type: 'scatter',
            data: data.map(item => [item[x_axis], item[key]]),
            emphasis: { focus: 'series' },
          }))
        : yAxes.map(key => ({
            name: series_name || key,
            type: type === 'area' ? 'line' : type,
            data: data.map(item => item[key]),
            areaStyle: type === 'area' ? {} : undefined,
            itemStyle: {
              color: '#4F46E5', // Indigo-600
            },
          }))

    const baseOption = {
      tooltip: {
        trigger: type === 'pie' ? 'item' : 'axis',
      },
      grid: {
        top: '4%', // Reduce top padding as title is external
        left: '4%',
        right: '4%',
        bottom: '4%',
        containLabel: true,
      },
      xAxis:
        type === 'scatter'
          ? { type: 'value' }
          : {
              type: 'category',
              data: xData,
              axisLabel: {
                interval: 'auto',
                hideOverlap: true,
                rotate: 0,
                width: 60,
                overflow: 'truncate',
              },
            },
      yAxis: {
        type: 'value',
      },
      series: baseSeries,
    }

    if (type === 'pie') {
      return {
        tooltip: { trigger: 'item' },
        series: [
          {
            name: series_name || yAxes[0],
            type: 'pie',
            radius: '50%',
            data: data.map(item => ({
              value: item[yAxes[0]],
              name: item[x_axis],
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      }
    }

    return baseOption
  }, [data, isRenderable, series_name, type, x_axis, yAxes])

  return (
    <div
      className={cn('relative', className)}
      ref={containerRef}
      style={{ height: '100%', width: '100%', ...style }}
    >
      <ReportChart
        option={option as any}
        className="relative h-full w-full"
        style={{ height: '100%', width: '100%', ...style }}
        onChartClick={handleChartClick}
      />
      {!isRenderable && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
          {t('no_chart_data')}
        </div>
      )}
      {menuState && (
        <DrillDownMenu
          x={menuState.x}
          y={menuState.y}
          dataName={menuState.name}
          onFocus={handleFocus}
          onViewData={handleViewData}
          onClose={() => setMenuState(null)}
        />
      )}
    </div>
  )
}
