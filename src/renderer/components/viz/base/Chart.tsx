import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, EChartsType } from 'echarts'
import { applyWansanTheme } from '../../../lib/echarts-theme'

interface ReportChartProps {
  option: EChartsOption
  className?: string
  style?: React.CSSProperties
  onChartClick?: (params: any) => void
  highlightedItems?: string[]
}

export function Chart({
  option,
  className,
  style,
  onChartClick,
  highlightedItems = [],
}: ReportChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<EChartsType | null>(null)

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
    const themedOption = applyWansanTheme(option)
    instanceRef.current.setOption(themedOption, { notMerge: true })
  }, [option])

  // Handle Highlights
  useEffect(() => {
    const instance = instanceRef.current
    if (!instance) return

    // Always reset downplay first to ensure clean state
    // We target seriesIndex 0 as most of our charts are single-series or shared axis
    instance.dispatchAction({
      type: 'downplay',
      seriesIndex: 0,
    })

    if (highlightedItems.length === 0) {
      instance.dispatchAction({
        type: 'hideTip',
      })
      return
    }

    // Highlight specific items by name (X-axis category or Pie sector name)
    instance.dispatchAction({
      type: 'highlight',
      seriesIndex: 0,
      name: highlightedItems,
    })

    // Note: We intentionally DO NOT trigger 'showTip' here.
    // The Insight Panel already provides the textual context.
    // The chart's role is purely visual anchoring (highlighting "Where").
    // Forcing a tooltip often occludes the chart or causes overlap issues.
    // The user can still hover the chart manually if they want to see the tooltip.
  }, [highlightedItems])

  return <div ref={chartRef} className={className} style={style} />
}
