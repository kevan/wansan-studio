import { EChartsOption } from 'echarts'

// Wansan Color Palette
const COLORS = [
  '#4F46E5', // Indigo 600 (Primary)
  '#10B981', // Emerald 500
  '#F59E0B', // Amber 500
  '#EC4899', // Pink 500
  '#6366F1', // Indigo 500
  '#8B5CF6', // Violet 500
]

export function applyWansanTheme(option: EChartsOption): EChartsOption {
  const isDark = document.documentElement.classList.contains('dark')
  const textColor = isDark ? '#a1a1aa' : '#52525b' // zinc-400 / zinc-600
  const gridColor = isDark ? '#27272a' : '#f4f4f5' // zinc-800 / zinc-100

  // Ensure xAxis and yAxis are objects or arrays, handling them safely
  const xAxis = Array.isArray(option.xAxis)
    ? option.xAxis.map((x: any) => ({
        ...x,
        axisLine: { lineStyle: { color: gridColor } },
        axisTick: { show: false },
        axisLabel: { color: textColor, fontSize: 11 },
        splitLine: { show: false },
      }))
    : {
        ...(option.xAxis as any),
        axisLine: { lineStyle: { color: gridColor } },
        axisTick: { show: false },
        axisLabel: { color: textColor, fontSize: 11 },
        splitLine: { show: false },
      }

  const yAxis = Array.isArray(option.yAxis)
    ? option.yAxis.map((y: any) => ({
        ...y,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: textColor, fontSize: 11 },
        splitLine: {
          show: true,
          lineStyle: { color: gridColor, type: 'dashed' },
        },
      }))
    : {
        ...(option.yAxis as any),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: textColor, fontSize: 11 },
        splitLine: {
          show: true,
          lineStyle: { color: gridColor, type: 'dashed' },
        },
      }

  return {
    ...option,
    color: COLORS,
    backgroundColor: 'transparent',
    // 1. Force Hide Title (Use Card Header instead)
    title: { show: false },
    // 2. Clean Grid
    grid: {
      top: 40,
      right: 20,
      bottom: 30,
      left: 10,
      containLabel: true,
      borderColor: 'transparent',
      ...(option.grid as any),
    },
    // 3. Minimalist Axis
    xAxis,
    yAxis,
    // 4. Shadcn-style Tooltip
    tooltip: {
      ...(option.tooltip as any),
      backgroundColor: isDark ? '#18181b' : '#ffffff',
      borderColor: isDark ? '#27272a' : '#e4e4e7',
      textStyle: { color: isDark ? '#fafafa' : '#18181b', fontSize: 12 },
      padding: [8, 12],
      extraCssText:
        'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border-radius: 8px;',
    },
    // 5. Legend
    legend: {
      ...(option.legend as any),
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 20,
      textStyle: {
        color: isDark ? '#a1a1aa' : '#9ca3af',
        fontSize: 12,
      },
      show:
        option.series &&
        Array.isArray(option.series) &&
        option.series.length > 1,
    },
  }
}
