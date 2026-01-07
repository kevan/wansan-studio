import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts'
import type { ChartType, ReportData } from '@shared/types/dashboard'


type VizConfig = NonNullable<ReportData['vizConfig']>

/**
 * Categorizes chart types into groups for conversion logic
 */
function getChartCategory(
  type: ChartType
): 'cartesian' | 'radial' | 'tabular' | 'kpi' | 'text' {
  const cartesianTypes = ['bar', 'line', 'area', 'scatter', 'combo']
  const radialTypes = ['pie', 'radar']
  const tabularTypes = ['table']
  const kpiTypes = ['kpi']

  if (cartesianTypes.includes(type)) return 'cartesian'
  if (radialTypes.includes(type)) return 'radial'
  if (tabularTypes.includes(type)) return 'tabular'
  if (kpiTypes.includes(type)) return 'kpi'
  if (type === 'text') return 'text'

  return 'cartesian' // default
}

/**
 * Adapts visualization configuration when switching chart types
 * Handles data structure mapping between different chart type categories
 *
 * @param newType - Target chart type
 * @param oldType - Current chart type
 * @param oldConfig - Current visualization configuration
 * @param data - Raw data rows
 * @returns Adapted configuration for the new chart type
 */
export function adaptChartConfig(
  newType: ChartType,
  oldType: ChartType | undefined,
  oldConfig: VizConfig | undefined,
  data: Array<Record<string, any>>
): { type: ChartType; config?: VizConfig } {
  const targetType = newType

  const oldCategory = oldType ? getChartCategory(oldType) : 'cartesian'
  const newCategory = getChartCategory(targetType)

  // Case 1: Same category conversion (trivial)
  if (oldCategory === newCategory && oldCategory !== 'radial') {
    // For cartesian charts, just change the type
    return {
      type: targetType,
      config: oldConfig,
    }
  }

  // Case 2: Cartesian to Radial (e.g., bar -> pie)
  if (oldCategory === 'cartesian' && newCategory === 'radial') {
    const xAxis = oldConfig?.x_axis
    const yAxis = Array.isArray(oldConfig?.y_axis)
      ? oldConfig?.y_axis?.[0]
      : oldConfig?.y_axis

    // If we have valid axes, preserve them
    if (xAxis && yAxis) {
      return {
        type: targetType,
        config: {
          x_axis: xAxis,
          y_axis: [yAxis],
          series_name: oldConfig?.series_name,
        },
      }
    }

    // Otherwise, try to intelligently select columns
    if (data.length > 0) {
      const columns = Object.keys(data[0])
      const numericColumns = columns.filter(col => {
        const value = data[0][col]
        return typeof value === 'number'
      })
      const textColumns = columns.filter(col => {
        const value = data[0][col]
        return typeof value === 'string'
      })

      // Select first text column as x-axis (categories)
      // Select first numeric column as y-axis (values)
      if (textColumns.length > 0 && numericColumns.length > 0) {
        return {
          type: targetType,
          config: {
            x_axis: textColumns[0],
            y_axis: [numericColumns[0]],
          },
        }
      }
    }
  }

  // Case 3: Radial to Cartesian (e.g., pie -> bar)
  if (oldCategory === 'radial' && newCategory === 'cartesian') {
    // For pie to cartesian, try to preserve the same columns if possible
    if (oldConfig?.x_axis && oldConfig?.y_axis) {
      return {
        type: targetType,
        config: oldConfig,
      }
    }

    // Otherwise, intelligently select columns
    if (data.length > 0) {
      const columns = Object.keys(data[0])
      const numericColumns = columns.filter(col => {
        const value = data[0][col]
        return typeof value === 'number'
      })
      const textColumns = columns.filter(col => {
        const value = data[0][col]
        return typeof value === 'string'
      })

      if (textColumns.length > 0 && numericColumns.length > 0) {
        return {
          type: targetType,
          config: {
            x_axis: textColumns[0],
            y_axis: [numericColumns[0]],
          },
        }
      }
    }
  }

  // Case 4: Any to Table
  if (newCategory === 'tabular') {
    return {
      type: 'table',
      config: {}, // Table doesn't need axis configuration
    }
  }

  // Case 5: Any to KPI
  if (newCategory === 'kpi') {
    // For KPI, select the first numeric column if available
    let selectedColumn: string | undefined

    if (data.length > 0) {
      const columns = Object.keys(data[0])
      const numericColumns = columns.filter(col => {
        const value = data[0][col]
        return typeof value === 'number'
      })

      if (numericColumns.length > 0) {
        selectedColumn = numericColumns[0]
      }
    }

    return {
      type: 'kpi',
      config: selectedColumn
        ? {
            y_axis: [selectedColumn],
          }
        : {},
    }
  }

  // Case 6: Any to Text
  if (newCategory === 'text') {
    return {
      type: 'text',
      config: {},
    }
  }

  // Default fallback: return a basic configuration
  // This handles cases like undefined oldType or uncategorized conversions
  if (data.length > 0) {
    const columns = Object.keys(data[0])
    const numericColumns = columns.filter(col => {
      const value = data[0][col]
      return typeof value === 'number'
    })
    const textColumns = columns.filter(col => {
      const value = data[0][col]
      return typeof value === 'string'
    })

    if (textColumns.length > 0 && numericColumns.length > 0) {
      return {
        type: targetType,
        config: {
          x_axis: textColumns[0],
          y_axis: [numericColumns[0]],
        },
      }
    }

    if (numericColumns.length > 0) {
      return {
        type: targetType,
        config: {
          y_axis: [numericColumns[0]],
        },
      }
    }
  }

  return {
    type: targetType,
    config: {},
  }
}

/**
 * Generates a complete EChartsOption based on chart type and configuration
 * Used by components like A4Chart to render the actual chart
 */
export function buildEChartsOption(
  type: ChartType,
  config: VizConfig | undefined,
  data: Array<Record<string, any>>
): EChartsOption {
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
  const isRenderable =
    hasData && hasAxes && type !== 'table' && type !== 'kpi' && type !== 'text'

  if (!isRenderable || !x_axis || yAxes.length === 0) {
    return {}
  }

  const xData = data.map(item => item[x_axis])

  // Check if X-axis should be numeric (standard scatter) or categorical (dot plot)
  const isXAxisNumeric =
    type === 'scatter' &&
    xData.every(val => {
      if (val === null || val === undefined || val === '') return true
      const num = Number(val)
      return !isNaN(num) && isFinite(num)
    })

  const getSeriesName = (index: number) => {
    if (Array.isArray(series_name)) {
      return series_name[index] || yAxes[index]
    }
    return series_name || yAxes[index]
  }

  const baseSeries: echarts.SeriesOption[] =
    type === 'scatter'
      ? yAxes.map((key, index) => ({
          name: getSeriesName(index),
          type: 'scatter',
          // If X-axis is numeric, we map [x, y]. ECharts handles strings on category axis automatically.
          data: data.map(item => [item[x_axis], item[key]]),
          emphasis: { focus: 'series' },
          symbolSize: 10,
        }))
      : yAxes.map((key, index) => ({
          name: getSeriesName(index),
          type: (type === 'area'
            ? 'line'
            : type === 'combo'
              ? 'bar'
              : type) as any,
          data: data.map(item => item[key]),
          areaStyle: type === 'area' ? {} : undefined,
          // itemStyle: { color: '#4F46E5' } // Removed to allow theme colors to take effect
        }))

  const baseOption: EChartsOption = {
    tooltip: {
      trigger:
        type === 'pie' || type === 'radar' || (type === 'scatter' && isXAxisNumeric)
          ? 'item'
          : 'axis',
    },
    grid: {
      left: '2%',
      right: '2%',
      bottom: '4%',
      top: '12%',
      containLabel: true,
    },
    xAxis:
      type === 'scatter'
        ? {
            type: isXAxisNumeric ? ('value' as const) : ('category' as const),
            data: isXAxisNumeric ? undefined : xData,
            scale: true, // Optimizes view for numeric axes
            axisLabel: {
              interval: 'auto',
              rotate: 45,
              fontSize: 10,
              hideOverlap: true,
            },
            splitLine: {
              show: isXAxisNumeric, // Show grid for numeric scatter
              lineStyle: {
                type: 'dashed',
                color: '#F3F4F6',
              },
            },
          }
        : {
            type: 'category' as const,
            triggerEvent: true,
            data: xData,
            axisLabel: {
              interval: 'auto',
              rotate: 45,
              fontSize: 10,
              hideOverlap: true,
            },
            axisTick: {
              alignWithLabel: true,
            },
          },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#F3F4F6', // gray-100
        },
      },
    },
    series: baseSeries,
  }

  if (type === 'pie') {
    return {
      tooltip: { trigger: 'item' },
      series: [
        {
          name: Array.isArray(series_name)
            ? series_name[0] || yAxes[0]
            : series_name || yAxes[0],
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

  // Radar Chart: Each row is a data point, each y_axis is an indicator
  if (type === 'radar') {
    // Heuristic: If we have fewer than 3 metrics (Y-axes), standard radar chart logic (using metrics as axes)
    // produces a line or a flat shape. In this case, we TRANSPOSE the data:
    // Use X-Axis values (e.g., Months) as the Radar Axes (Indicators), and Y-Axis columns as Series.
    const useTranspose = yAxes.length < 3

    if (useTranspose) {
      // Transposed Mode: X-Axis = Indicators, Y-Axis Columns = Series
      // Limit to top 12 categories to prevent clutter
      const displayData = data.slice(0, 12)

      // Calculate global max for scaling
      let globalMax = 0
      for (const row of displayData) {
        for (const key of yAxes) {
          const val = Number(row[key]) || 0
          if (val > globalMax) globalMax = val
        }
      }
      globalMax = globalMax * 1.2 || 100

      const indicators = displayData.map(item => ({
        name: String(item[x_axis]),
        max: globalMax,
      }))

      const seriesData = yAxes.map(yKey => ({
        name: yKey,
        value: displayData.map(item => Number(item[yKey]) || 0),
      }))

      return {
        tooltip: { trigger: 'item' },
        legend: {
          data: yAxes,
          top: 0,
        },
        radar: {
          indicator: indicators,
          shape: 'polygon',
          splitNumber: 4,
          axisName: {
            color: '#71717a',
            fontSize: 11,
          },
          splitLine: {
            lineStyle: { color: '#f4f4f5' },
          },
          splitArea: {
            show: true,
            areaStyle: { color: ['#fafafa', '#fff'] },
          },
        },
        series: [
          {
            type: 'radar',
            data: seriesData,
            emphasis: {
              lineStyle: { width: 3 },
            },
          },
        ],
      }
    } else {
      // Standard Mode: Y-Axis Columns = Indicators, Data Rows = Series (Comparison)
      const maxValues: Record<string, number> = {}
      for (const key of yAxes) {
        maxValues[key] = Math.max(...data.map(d => Number(d[key]) || 0)) * 1.2
      }

      const indicators = yAxes.map(key => ({
        name: key,
        max: maxValues[key] || 100,
      }))

      const radarData = data.map(item => ({
        value: yAxes.map(key => item[key]),
        name: item[x_axis],
      }))

      return {
        tooltip: { trigger: 'item' },
        legend: {
          data: data.map(item => item[x_axis]),
          top: 0,
        },
        radar: {
          indicator: indicators,
          shape: 'polygon',
          splitNumber: 4,
          axisName: {
            color: '#71717a',
            fontSize: 11,
          },
          splitLine: {
            lineStyle: { color: '#f4f4f5' },
          },
          splitArea: {
            show: true,
            areaStyle: { color: ['#fafafa', '#fff'] },
          },
        },
        series: [
          {
            type: 'radar',
            data: radarData,
            emphasis: {
              lineStyle: { width: 3 },
            },
          },
        ],
      }
    }
  }

  // Combo Chart: First y_axis as bar, rest as lines
  if (type === 'combo' && yAxes.length >= 2) {
    const barKey = yAxes[0]
    const lineKeys = yAxes.slice(1)

    const comboSeries: echarts.SeriesOption[] = [
      {
        name: getSeriesName(0),
        type: 'bar',
        data: data.map(item => item[barKey]),
        yAxisIndex: 0,
      },
      ...lineKeys.map((key, i) => ({
        name: getSeriesName(i + 1),
        type: 'line' as const,
        data: data.map(item => item[key]),
        yAxisIndex: 1,
        smooth: true,
      })),
    ]

    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category' as const,
        data: xData,
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: getSeriesName(0),
          position: 'left',
          axisLabel: { fontSize: 10 },
        },
        {
          type: 'value' as const,
          name: lineKeys.length === 1 ? getSeriesName(1) : 'Rate',
          position: 'right',
          axisLabel: { fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: comboSeries,
    }
  }

  return baseOption
}

/**
 * Extracts chart type from ECharts option
 */
export function extractChartType(option: EChartsOption): ChartType | undefined {
  const series = Array.isArray(option.series) ? option.series[0] : option.series
  if (!series) return undefined

  const seriesType = (series as any).type
  if (seriesType === 'scatter') return 'scatter'
  if (seriesType === 'pie') return 'pie'
  if (seriesType === 'line') {
    return (series as any).areaStyle ? 'area' : 'line'
  }
  if (seriesType === 'bar') return 'bar'

  return seriesType as ChartType
}

/**
 * Limits the number of categories for pie charts (improves readability)
 */
export function limitPieCategories(
  data: Array<Record<string, any>>,
  xAxis: string,
  yAxis: string,
  maxCategories: number = 20
): Array<Record<string, any>> {
  if (data.length <= maxCategories) return data

  // Sort by value (descending)
  const sorted = [...data].sort((a, b) => (b[yAxis] || 0) - (a[yAxis] || 0))

  // Take top N-1 categories
  const topCategories = sorted.slice(0, maxCategories - 1)

  // Sum remaining as "Others"
  const others = sorted.slice(maxCategories - 1)
  if (others.length > 0) {
    const othersSum = others.reduce((sum, item) => sum + (item[yAxis] || 0), 0)
    topCategories.push({
      [xAxis]: 'Others',
      [yAxis]: othersSum,
    } as any)
  }

  return topCategories
}
