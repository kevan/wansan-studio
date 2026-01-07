import type { ChartType } from '@shared/types/dashboard'

export type DisplayMode = 'chart' | 'table' | 'bignumber' | 'empty' | 'text'

export function getDisplayMode(
  chartType: ChartType | undefined,
  data: any[],
  vizConfig?: any
): DisplayMode {
  const hasData = data && data.length > 0
  if (!hasData && chartType !== 'text') return 'empty'

  if (chartType === 'kpi') return 'bignumber'
  if (chartType === 'text') return 'text'

  const showAsTable =
    chartType === 'table' || !vizConfig?.x_axis || !vizConfig?.y_axis

  if (showAsTable) return 'table'

  return 'chart'
}
