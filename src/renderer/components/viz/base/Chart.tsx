import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, EChartsType } from 'echarts'
import { applyWansanTheme } from '../../../lib/echarts-theme'

interface ReportChartProps {
  option: EChartsOption
  className?: string
  style?: React.CSSProperties
  onChartClick?: (params: any) => void
}

export function Chart({
  option,
  className,
  style,
  onChartClick,
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

  return <div ref={chartRef} className={className} style={style} />
}
