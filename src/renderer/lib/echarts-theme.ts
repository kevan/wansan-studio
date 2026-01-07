import { EChartsOption } from 'echarts'

// Wansan Modern Palette (Airy & Swiss)
// Optimized for light mode primarily, with dark mode fallbacks
const COLORS = [
  '#6366F1', // Indigo 500 (Primary)
  '#10B981', // Emerald 500 (Success/Growth)
  '#F59E0B', // Amber 500 (Warning/Attention)
  '#EC4899', // Pink 500 (Highlight)
  '#8B5CF6', // Violet 500
  '#3B82F6', // Blue 500
  '#F43F5E', // Rose 500
  '#14B8A6', // Teal 500
]

// Enhanced Gradient Utils with better opacity transitions
const getLinearGradient = (color: string, opacity: number = 0.06) => {
  const endOpacity = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: color },
      { offset: 0.7, color: `${color}40` }, // 25% opacity midpoint
      { offset: 1, color: `${color}${endOpacity}` },
    ],
  }
}

// Bar chart gradient (top to bottom with subtle glow)
const getBarGradient = (color: string) => ({
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: color },
    { offset: 0.5, color: color },
    { offset: 1, color: `${color}CC` }, // 80% opacity at bottom
  ],
})

/**
 * Creates a rich HTML tooltip with glassmorphism styling
 * Used for axis-triggered tooltips (bar, line charts)
 */
export function getAxisTooltipFormatter(isDark: boolean) {
  return (params: any) => {
    if (!Array.isArray(params) || params.length === 0) return ''

    const categoryName = params[0]?.axisValueLabel || params[0]?.name || ''
    const bgColor = isDark ? 'rgba(24,24,27,0.95)' : 'rgba(255,255,255,0.98)'
    const textColor = isDark ? '#fafafa' : '#18181b'
    const mutedColor = isDark ? '#a1a1aa' : '#71717a'

    let rows = ''
    for (const p of params) {
      if (p.value === undefined || p.value === null) continue
      const value =
        typeof p.value === 'number' ? p.value.toLocaleString() : p.value
      rows += `
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
          <span style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0;"></span>
          <span style="flex:1;color:${mutedColor};font-size:12px;">${p.seriesName}</span>
          <span style="font-weight:600;color:${textColor};font-size:13px;">${value}</span>
        </div>
      `
    }

    return `
      <div style="
        font-family:Inter,system-ui,sans-serif;
        padding:12px 16px;
        background:${bgColor};
        backdrop-filter:blur(12px);
        border-radius:12px;
        box-shadow:0 10px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.05);
        min-width:160px;
      ">
        <div style="font-size:11px;font-weight:600;color:${mutedColor};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          ${categoryName}
        </div>
        ${rows}
      </div>
    `
  }
}

/**
 * Creates a tooltip formatter for pie/item-based charts
 */
export function getItemTooltipFormatter(isDark: boolean) {
  return (params: any) => {
    const bgColor = isDark ? 'rgba(24,24,27,0.95)' : 'rgba(255,255,255,0.98)'
    const textColor = isDark ? '#fafafa' : '#18181b'
    const mutedColor = isDark ? '#a1a1aa' : '#71717a'

    const name = params.name || ''
    const value =
      typeof params.value === 'number'
        ? params.value.toLocaleString()
        : params.value
    const percent = params.percent ? `${params.percent.toFixed(1)}%` : ''

    return `
      <div style="
        font-family:Inter,system-ui,sans-serif;
        padding:12px 16px;
        background:${bgColor};
        backdrop-filter:blur(12px);
        border-radius:12px;
        box-shadow:0 10px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.05);
        min-width:140px;
      ">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${params.color};"></span>
          <span style="font-weight:600;color:${textColor};font-size:13px;">${name}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px;">
          <span style="color:${mutedColor};font-size:12px;">${value}</span>
          ${percent ? `<span style="font-weight:600;color:${textColor};font-size:12px;">${percent}</span>` : ''}
        </div>
      </div>
    `
  }
}

export function applyWansanTheme(option: EChartsOption): EChartsOption {
  const isDark = document.documentElement.classList.contains('dark')

  // Theme Colors
  const textColor = isDark ? '#a1a1aa' : '#71717a' // zinc-400 / zinc-500
  const splitLineColor = isDark ? '#27272a' : '#f4f4f5' // zinc-800 / zinc-100

  // Detect chart type for tooltip behavior
  const isPieChart =
    Array.isArray(option.series) &&
    option.series.some((s: any) => s.type === 'pie')

  // 1. Enhance Series (Bar, Line, Pie)
  const series = Array.isArray(option.series)
    ? option.series.map((s: any, index) => {
        const baseColor = COLORS[index % COLORS.length]

        // Bar Chart Styling
        if (s.type === 'bar') {
          return {
            ...s,
            itemStyle: {
              borderRadius: [6, 6, 0, 0],
              color: getBarGradient(baseColor),
              shadowColor: `${baseColor}30`,
              shadowBlur: 8,
              shadowOffsetY: 2,
              ...s.itemStyle,
            },
            barMaxWidth: 48,
            emphasis: {
              itemStyle: {
                shadowBlur: 16,
                shadowColor: `${baseColor}50`,
              },
            },
          }
        }

        // Line Chart Styling
        if (s.type === 'line') {
          // Check if areaStyle exists (even if empty object) to identify Area Charts
          const isAreaChart = s.areaStyle !== undefined && s.areaStyle !== null

          return {
            ...s,
            smooth: true, // Spline interpolation
            showSymbol: false, // Clean lines
            symbolSize: 8,
            lineStyle: {
              width: 3,
              shadowColor: `${baseColor}40`, // 25% opacity
              shadowBlur: 10,
              shadowOffsetY: 4,
              ...s.lineStyle,
            },
            areaStyle: isAreaChart
              ? {
                  opacity: 0.3,
                  color: getLinearGradient(baseColor, 0.1),
                }
              : undefined,
          }
        }

        // Pie Chart Styling
        if (s.type === 'pie') {
          return {
            ...s,
            radius: ['40%', '70%'], // Donut style by default
            itemStyle: {
              borderRadius: 5,
              borderColor: isDark ? '#000' : '#fff',
              borderWidth: 2,
              ...s.itemStyle,
            },
            label: {
              show: false, // Cleaner look
              position: 'center',
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 16,
                fontWeight: 'bold',
              },
            },
          }
        }

        return s
      })
    : option.series

  // 2. Axis Styling
  const commonAxis = {
    axisLine: { show: false }, // Hide axis lines
    axisTick: { show: false }, // Hide ticks
    axisLabel: {
      color: textColor,
      fontSize: 11,
      fontFamily: 'Inter, system-ui, sans-serif',
      margin: 12,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: splitLineColor,
        type: 'dashed' as const,
        width: 1,
      },
    },
  }

  const xAxis = Array.isArray(option.xAxis)
    ? option.xAxis.map((x: any) => ({
        ...x,
        ...commonAxis,
        splitLine: { show: false }, // Usually hide vertical grid
      }))
    : {
        ...(option.xAxis as any),
        ...commonAxis,
        splitLine: { show: false },
      }

  const yAxis = Array.isArray(option.yAxis)
    ? option.yAxis.map((y: any) => ({
        ...y,
        ...commonAxis,
      }))
    : {
        ...(option.yAxis as any),
        ...commonAxis,
      }

  return {
    ...option,
    color: COLORS,
    backgroundColor: 'transparent',
    title: { show: false }, // Managed by React components

    // 3. Grid Layout
    grid: {
      top: 30,
      right: 20,
      bottom: 20,
      left: 10,
      containLabel: true,
      borderColor: 'transparent',
      ...(option.grid as any),
    },

    xAxis,
    yAxis,
    series,

    // 4. Modern Tooltip with HTML Formatter
    tooltip: {
      trigger: isPieChart ? 'item' : 'axis',
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      formatter: isPieChart
        ? getItemTooltipFormatter(isDark)
        : getAxisTooltipFormatter(isDark),
      ...(option.tooltip as any),
    },

    // 5. Minimal Legend
    legend: {
      top: 0,
      padding: [0, 0, 10, 0], // Add padding bottom
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 24,
      textStyle: {
        color: textColor,
        fontSize: 12,
      },
      // Only show legend if multiple series
      show: series && Array.isArray(series) && series.length > 1,
      ...(option.legend as any),
    },
  }
}
