import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { buildEChartsOption } from '../lib/viz-adapter'
import type { ChartType, ReportData } from '@shared/types/dashboard'

interface UseChartOptionProps {
  type?: ChartType
  data?: Array<Record<string, any>>
  config?: ReportData['vizConfig']
}

export function useChartOption({
  type = 'bar',
  data = [],
  config,
}: UseChartOptionProps): EChartsOption {
  const option = useMemo(() => {
    return buildEChartsOption(type as ChartType, config as any, data)
  }, [type, config, data])

  return option
}
