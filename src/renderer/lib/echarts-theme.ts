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
 * Helper to extract a displayable value from ECharts params
 */
function getDisplayValue(val: any): string {
  if (val === undefined || val === null) return '-'
  
  let target = val
  if (Array.isArray(val)) {
    // For [x, y] or [x, y, z] data, y is usually the value we want to show
    // If it's a scatter chart with numeric X, index 1 is Y.
    // In our typical data structure, the last element is often the metric.
    target = val.length > 1 ? val[val.length - 1] : val[0]
  }

  if (typeof target === 'number') {
    return target.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
  return String(target)
}

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
      const value = getDisplayValue(p.value)
      rows += `
        <div style="display:flex;align-items:center;gap:12px;padding:4px 0;">
          <span style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0;"></span>
          <span style="flex:1;color:${mutedColor};font-size:12px;white-space:nowrap;margin-right:8px;">${p.seriesName}</span>
          <span style="font-weight:600;color:${textColor};font-size:13px;tabular-nums:proportional-nums;">${value}</span>
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
        min-width:180px;
        border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
      ">
        <div style="font-size:11px;font-weight:700;color:${mutedColor};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;border-bottom:1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};padding-bottom:6px;">
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
    const seriesName = params.seriesName || ''
    const value = getDisplayValue(params.value)
    const percent = params.percent ? `${params.percent.toFixed(1)}%` : ''

    return `
      <div style="
        font-family:Inter,system-ui,sans-serif;
        padding:12px 16px;
        background:${bgColor};
        backdrop-filter:blur(12px);
        border-radius:12px;
        box-shadow:0 10px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.05);
        min-width:180px;
        border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
      ">
        <div style="font-size:11px;font-weight:700;color:${mutedColor};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;border-bottom:1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};padding-bottom:6px;">
          ${name}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${params.color};flex-shrink:0;"></span>
          <span style="flex:1;font-weight:600;color:${textColor};font-size:13px;white-space:nowrap;">${seriesName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:baseline;">
          <span style="color:${mutedColor};font-size:12px;font-family:monospace;">${value}</span>
          ${percent ? `<span style="font-weight:700;color:${textColor};font-size:12px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};padding:2px 6px;border-radius:4px;">${percent}</span>` : ''}
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
  
  const isRadarChart =
    Array.isArray(option.series) &&
    option.series.some((s: any) => s.type === 'radar')
  
  const isItemTriggered = isPieChart || isRadarChart

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
              focus: 'self', // Critical: Dim everything else
              itemStyle: {
                shadowBlur: 16,
                shadowColor: `${baseColor}50`,
                borderColor: '#fff',
                borderWidth: 2,
              },
            },
            blur: {
              itemStyle: {
                opacity: 0.1, // Strong fade out
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

            // Workaround: To allow highlighting specific points via dispatchAction,
            // we must set showSymbol: true. To keep the clean look, we hide them
            // using itemStyle.opacity: 0 in normal state.
            showSymbol: true,
            symbol: 'circle',
            symbolSize: 8, // Larger size for better interaction target

            itemStyle: {
              opacity: 0, // Hidden by default
              color: baseColor,
              borderColor: '#fff',
              borderWidth: 2,
              ...s.itemStyle,
            },

            lineStyle: {
              width: 3,
              shadowColor: `${baseColor}40`, // 25% opacity
              shadowBlur: 10,
              shadowOffsetY: 4,
              ...s.lineStyle,
            },
            emphasis: {
              focus: 'series', // Keep the line visible
              scale: true,
              lineStyle: {
                width: 4,
              },
              itemStyle: {
                opacity: 1, // Visible on highlight/hover
                borderColor: '#fff',
                borderWidth: 2,
                shadowBlur: 10,
                shadowColor: baseColor,
              },
            },
            blur: {
              lineStyle: {
                opacity: 0.1,
              },
              itemStyle: {
                opacity: 0, // Keep hidden
              },
            },
            areaStyle: isAreaChart
              ? {
                  opacity: 0.3,
                  color: getLinearGradient(baseColor, 0.1),
                }
              : undefined,
          }
        }

        // Pie / Rose Chart Styling
        if (s.type === 'pie') {
          const isRose = s.roseType === 'radius'

          return {
            ...s,
            // Rose: 10-65% to give plenty of room for labels, Pie: 40-70%
            radius: isRose ? ['10%', '65%'] : ['40%', '70%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: isRose ? 10 : 6,
              borderColor: isDark ? '#000' : '#fff',
              borderWidth: 2,
              ...s.itemStyle,
            },
            label: {
              show: false, // Cleaner look normally
            },
            labelLine: {
              show: false,
            },
            labelLayout: {
              hideOverlap: true, // Critical: Automatically hide overlapping labels
            },
            emphasis: {
              focus: 'self',
              scale: true,
              scaleSize: isRose ? 12 : 10,
              itemStyle: {
                shadowBlur: 20,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0,0,0,0.2)',
                borderColor: '#fff',
                borderWidth: 3,
              },
              label: {
                show: true, // Re-enable labels
                margin: 20,
                fontSize: 12,
                fontWeight: '600',
                color: isDark ? '#fff' : '#18181b',
                formatter: '{b}: {d}%',
              },
              labelLine: {
                show: true,
                length: 15,
                length2: 0,
                smooth: true,
                lineStyle: {
                  width: 1.5,
                  color: splitLineColor,
                },
              },
            },
            blur: {
              itemStyle: {
                opacity: 0.1,
              },
            },
          }
        }

        // Scatter Chart Styling (Generic fallback for others)
        if (s.type === 'scatter') {
             return {
                 ...s,
                 emphasis: {
                     focus: 'self',
                     scale: true,
                 },
                 blur: {
                     itemStyle: {
                         opacity: 0.1
                     }
                 }
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
      trigger: isItemTriggered ? 'item' : 'axis',
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      formatter: isItemTriggered
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
