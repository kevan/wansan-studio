import type { AIAnalysisResult } from '@shared/types'

export type DisplayMode = 'chart' | 'table' | 'bignumber' | 'empty'

export function getDisplayMode(
  chartType: AIAnalysisResult['visualization']['type'],
  data: any[],
  vizConfig?: any
): DisplayMode {
  const hasData = data && data.length > 0
  if (!hasData) return 'empty'

  const isBigNumber =
    chartType === 'kpi' &&
    data.length === 1 &&
    Object.keys(data[0] || {}).length > 0

  if (isBigNumber) return 'bignumber'

  const showAsTable =
    chartType === 'table' || !vizConfig?.x_axis || !vizConfig?.y_axis

  if (showAsTable) return 'table'

  return 'chart'
}
