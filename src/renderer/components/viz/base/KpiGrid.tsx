import React from 'react'
import { cn } from '@/utils/cn'
import type { ReportData } from '@shared/types/dashboard'

interface KpiGridProps {
  /** Mode 1: Data from a single ReportData (can be multi-row or multi-column) */
  reportData?: ReportData
  /** Mode 2: List of separate widgets (legacy ReportKpiRow behavior) */
  widgets?: any[]
  variant?: 'chat' | 'dashboard' | 'report'
  className?: string
  /** Items to highlight (for visual anchoring) */
  highlightedItems?: string[]
}

export function KpiGrid({
  reportData,
  widgets,
  variant: _variant = 'chat',
  className,
  highlightedItems = [],
}: KpiGridProps) {
  const kpis: Array<{ id: string; label: string; value: any; sublabel?: string }> = []

  // Case 1: Extract from single ReportData (Smart Expansion)
  if (reportData && reportData.tableData) {
    const data = reportData.tableData
    const config = reportData.vizConfig
    const yAxes = Array.isArray(config?.y_axis)
      ? config.y_axis
      : config?.y_axis
        ? [config.y_axis]
        : data[0]
          ? Object.keys(data[0]).filter(k => typeof data[0][k] === 'number')
          : []

    const xAxis = config?.x_axis

    if (data.length > 1 && xAxis) {
      // Dimension Expansion: One card per row, showing the first Y-axis
      const targetY = yAxes[0]
      // PC: 12 items, Mobile: 8 items (controlled via CSS)
      data.slice(0, 12).forEach((row, idx) => {
        kpis.push({
          id: `row-${idx}`,
          label: String(row[xAxis] || 'Unknown'),
          value: row[targetY],
          sublabel: targetY !== 'value' ? targetY : undefined,
        })
      })
    } else if (data.length === 1) {
      // Metric Expansion: One card per Y-axis
      const row = data[0]
      yAxes.forEach((key, idx) => {
        kpis.push({
          id: `col-${idx}`,
          label: key,
          value: row[key],
        })
      })
    } else if (data.length > 0) {
      // Fallback: Just show the first one
      const row = data[0]
      const targetKey = yAxes[0] || Object.keys(row)[0]
      kpis.push({
        id: 'single',
        label: targetKey || 'Metric',
        value: row[targetKey],
      })
    }
  }

  // Case 2: Extract from multiple widgets
  if (widgets && widgets.length > 0) {
    widgets.forEach(w => {
      const d = w.reportData
      const row = d?.tableData?.[0]
      if (row) {
        const yCol = Array.isArray(d.vizConfig?.y_axis)
          ? d.vizConfig.y_axis[0]
          : d.vizConfig?.y_axis || Object.keys(row)[0]

        kpis.push({
          id: w.id,
          label: d.title || yCol,
          value: row[yCol],
        })
      }
    })
  }

  if (kpis.length === 0) return null

  // --- Layout Heuristics ---
  const count = kpis.length

  // 1. Determine Grid Columns
  const getGridCols = () => {
    if (count >= 7) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    if (count >= 4) return 'grid-cols-2 lg:grid-cols-4'
    if (count === 3) return 'grid-cols-1 md:grid-cols-3'
    if (count === 2) return 'grid-cols-2'
    return 'grid-cols-1'
  }

  // 2. Determine Font Scaling (Responsive + Compact for many items)
  const getFontStyles = () => {
    if (count >= 12) return { value: 'text-base sm:text-lg', label: 'text-[6px] sm:text-[7px]' }
    if (count >= 9) return { value: 'text-lg sm:text-xl', label: 'text-[7px] sm:text-[8px]' }
    if (count >= 6) return { value: 'text-lg sm:text-xl md:text-2xl', label: 'text-[8px] sm:text-[9px]' }
    if (count >= 4) return { value: 'text-xl sm:text-2xl md:text-3xl', label: 'text-[9px] sm:text-[10px]' }
    if (count >= 3) return { value: 'text-2xl sm:text-3xl md:text-4xl', label: 'text-[10px] sm:text-[11px]' }

    // 1-2 items: very prominent
    return { value: 'text-3xl sm:text-4xl md:text-5xl', label: 'text-[11px] sm:text-[12px]' }
  }

  const styles = getFontStyles()

  return (
    <div className={cn(
      'grid gap-1.5 sm:gap-2 md:gap-3 w-full p-1',
      getGridCols(),
      className
    )}>
      {kpis.map((kpi, idx) => {
        const isHighlighted = highlightedItems.includes(kpi.label)
        const isAnchoringActive = highlightedItems.length > 0
        
        return (
          <div
            key={kpi.id}
            className={cn(
              'bg-white border border-zinc-100 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 shadow-sm transition-all duration-300 group/kpi flex flex-col items-center justify-center text-center relative overflow-hidden',
              count <= 2 ? 'py-3 sm:py-4 md:py-6' : count <= 4 ? 'py-2 sm:py-3 md:py-4' : 'py-1.5 sm:py-2 md:py-3',
              // Hover effect with scale
              'hover:shadow-lg hover:scale-[1.02] hover:z-10',
              isHighlighted ? 'shadow-lg scale-[1.02] z-10' : (isAnchoringActive && 'opacity-40 grayscale-[0.5]'),
              // Hide items 9-12 on mobile (index >= 8)
              idx >= 8 && 'hidden sm:flex'
            )}
          >
            <div
              className={cn(
                "absolute top-0 left-0 w-1 h-full bg-indigo-500 transition-opacity",
                isHighlighted ? "opacity-100" : "opacity-0 group-hover/kpi:opacity-100"
              )}
            />

            <div
              className={cn(
                'font-black text-indigo-600 mb-1 font-mono tracking-tight transition-transform duration-200',
                isHighlighted && 'scale-105',
                styles.value
              )}
            >
              {typeof kpi.value === 'number'
                ? kpi.value.toLocaleString()
                : kpi.value}
            </div>

            <div
              className={cn(
                'font-bold text-zinc-400 uppercase tracking-[0.15em] line-clamp-1 px-2',
                styles.label
              )}
            >
              {kpi.label}
            </div>

            {kpi.sublabel && count <= 6 && (
              <div className="text-[9px] text-zinc-300 mt-1 font-medium italic">
                {kpi.sublabel}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
