import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, EChartsType } from 'echarts'
import { applyWansanTheme } from '../../../lib/echarts-theme'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface ReportChartProps {
  option: EChartsOption
  className?: string
  style?: React.CSSProperties
  onChartClick?: (params: any) => void
  highlightedItems?: string[]
  showLabels?: boolean
}

export function Chart({
  option,
  className,
  style,
  onChartClick,
  highlightedItems = [],
  showLabels: localShowLabels,
}: ReportChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<EChartsType | null>(null)
  const globalShowLabels = useSettingsStore(state => state.showChartLabels)

  const showChartLabels = localShowLabels !== undefined ? localShowLabels : globalShowLabels

  useEffect(() => {
    const el = chartRef.current
    if (!el) return

    const instance = echarts.init(el)
    instanceRef.current = instance

    const resize = () => instance.resize()
    const observer = new ResizeObserver(() => resize())
    observer.observe(el)
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      observer.disconnect()
      instance.dispose()
      instanceRef.current = null
    }
  }, [])

  // Bind/Unbind click listener separately
  useEffect(() => {
    const instance = instanceRef.current
    if (!instance || !onChartClick) return

    const handler = (params: any) => {
      onChartClick(params)
    }

    instance.on('click', handler)
    return () => {
      instance.off('click', handler)
    }
  }, [onChartClick])

  useEffect(() => {
    if (!instanceRef.current) return
    const themedOption = applyWansanTheme(option, showChartLabels)
    instanceRef.current.setOption(themedOption, { notMerge: true })
  }, [option, showChartLabels])

  // Handle Highlights
  useEffect(() => {
    const instance = instanceRef.current
    if (!instance) return

    // Get current series to determine indices to target
    const currentOption = instance.getOption() as EChartsOption
    const seriesCount = Array.isArray(currentOption.series)
      ? currentOption.series.length
      : currentOption.series
        ? 1
        : 0
    
    if (seriesCount === 0) return

    // Create an array of all series indices [0, 1, 2, ...]
    const seriesIndices = Array.from({ length: seriesCount }, (_, i) => i)

    // Always reset downplay first to ensure clean state across all series
    instance.dispatchAction({
      type: 'downplay',
      seriesIndex: seriesIndices,
    })

    if (highlightedItems.length === 0) {
      instance.dispatchAction({
        type: 'hideTip',
      })
      return
    }

    // Highlight specific items by name across all series
    instance.dispatchAction({
      type: 'highlight',
      seriesIndex: seriesIndices,
      name: highlightedItems,
    })

    // Note: We intentionally DO NOT trigger 'showTip' here.
    // The Insight Panel already provides the textual context.
  }, [highlightedItems])

  return <div ref={chartRef} className={className} style={style} />
}
