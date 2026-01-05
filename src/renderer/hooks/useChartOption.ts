import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { buildEChartsOption } from '../lib/viz-adapter'

interface UseChartOptionProps {
  type?: 'bar' | 'line' | 'pie' | 'area' | 'table' | 'scatter' | 'kpi' | 'text'
  data?: Array<Record<string, any>>
  config?: {
    x_axis?: string | null
    y_axis?: string | string[] | null
    series_name?: string | string[]
  }
}

export function useChartOption({
  type = 'bar',
  data = [],
  config,
}: UseChartOptionProps): EChartsOption {
  const option = useMemo(() => {
    return buildEChartsOption(type, config, data)
  }, [type, config, data])

  return option
}
