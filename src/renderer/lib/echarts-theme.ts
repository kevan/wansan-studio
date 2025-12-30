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

// Gradient Utils
const getLinearGradient = (color: string) => {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: color }, // Start color
      { offset: 1, color: `${color}10` }, // End color (faded)
    ],
  }
}

export function applyWansanTheme(option: EChartsOption): EChartsOption {
  const isDark = document.documentElement.classList.contains('dark')
  
  // Theme Colors
  const textColor = isDark ? '#a1a1aa' : '#71717a' // zinc-400 / zinc-500
  const axisColor = isDark ? '#3f3f46' : '#e4e4e7' // zinc-700 / zinc-200
  const splitLineColor = isDark ? '#27272a' : '#f4f4f5' // zinc-800 / zinc-100
  const tooltipBg = isDark ? 'rgba(24, 24, 27, 0.9)' : 'rgba(255, 255, 255, 0.95)'
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7'

  // 1. Enhance Series (Bar, Line, Pie)
  const series = Array.isArray(option.series)
    ? option.series.map((s: any, index) => {
        const baseColor = COLORS[index % COLORS.length]
        
        // Bar Chart Styling
        if (s.type === 'bar') {
          return {
            ...s,
            itemStyle: {
              borderRadius: [6, 6, 0, 0], // Rounded top
              color: baseColor, // Could use gradient here if desired
              ...s.itemStyle,
            },
            barMaxWidth: 40,
            showBackground: true,
            backgroundStyle: {
              color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              borderRadius: [6, 6, 0, 0],
            },
          }
        }

        // Line Chart Styling
        if (s.type === 'line') {
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
            areaStyle: s.areaStyle ? {
              opacity: 0.2,
              color: getLinearGradient(baseColor)
            } : undefined
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
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 16,
                fontWeight: 'bold'
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

    // 4. Modern Tooltip
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: {
        color: isDark ? '#fafafa' : '#18181b',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      padding: [10, 14],
      extraCssText: 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); border-radius: 12px; backdrop-filter: blur(8px);',
      ...(option.tooltip as any),
    },

    // 5. Minimal Legend
    legend: {
      bottom: 0,
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