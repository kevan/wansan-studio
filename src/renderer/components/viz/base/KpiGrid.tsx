import React from 'react'
import { KpiCard } from './KpiCard'
import { cn } from '@/utils/cn'
import type { ReportData } from '@shared/types/dashboard'

interface KpiGridProps {
  /** Mode 1: Data from a single ReportData (can be multi-row or multi-column) */
  reportData?: ReportData
  /** Mode 2: List of separate widgets (legacy ReportKpiRow behavior) */
  widgets?: any[]
  variant?: 'chat' | 'dashboard'
  className?: string
}

export function KpiGrid({ reportData, widgets, variant = 'chat', className }: KpiGridProps) {
  const kpis: Array<{ id: string; label: string; value: any; sublabel?: string }> = []

  // Case 1: Extract from single ReportData (Smart Expansion)
  if (reportData && reportData.tableData) {
    const data = reportData.tableData
    const config = reportData.vizConfig
    const yAxes = Array.isArray(config?.y_axis)
      ? config.y_axis
      : config?.y_axis
        ? [config.y_axis]
        : data[0] ? Object.keys(data[0]).filter(k => typeof data[0][k] === 'number') : []
    
    const xAxis = config?.x_axis

    if (data.length > 1 && xAxis) {
      // Dimension Expansion: One card per row, showing the first Y-axis
      const targetY = yAxes[0]
      data.slice(0, 12).forEach((row, idx) => {
        kpis.push({
          id: `row-${idx}`,
          label: String(row[xAxis] || 'Unknown'),
          value: row[targetY],
          sublabel: targetY !== 'value' ? targetY : undefined
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
        kpis.push({
            id: 'single',
            label: yAxes[0] || 'Metric',
            value: row[yAxes[0] || Object.keys(row)[0]]
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
    if (variant === 'dashboard') {
      return count >= 2 ? 'grid-cols-2' : 'grid-cols-1'
    }
    if (count >= 7) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    if (count >= 4) return 'grid-cols-2 lg:grid-cols-4'
    if (count === 3) return 'grid-cols-1 md:grid-cols-3'
    if (count === 2) return 'grid-cols-2'
    return 'grid-cols-1'
  }

  // 2. Determine Font Scaling
  const getFontStyles = () => {
    if (count >= 9) return { value: 'text-2xl', label: 'text-[9px]' }
    if (count >= 5) return { value: 'text-3xl', label: 'text-[10px]' }
    return { value: 'text-4xl', label: 'text-[11px]' }
  }

  const styles = getFontStyles()

  return (
    <div className={cn('grid gap-4 w-full', getGridCols(), className)}>
      {kpis.map(kpi => (
        <div 
          key={kpi.id} 
          className={cn(
            "bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col items-center justify-center text-center relative overflow-hidden",
            count <= 2 ? "min-h-[160px]" : "min-h-[120px]"
          )}
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className={cn("font-black text-indigo-600 mb-1 font-mono tracking-tight group-hover:scale-105 transition-transform duration-300", styles.value)}>
            {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
          </div>
          
          <div className={cn("font-bold text-zinc-400 uppercase tracking-[0.15em] line-clamp-1 px-2", styles.label)}>
            {kpi.label}
          </div>
          
          {kpi.sublabel && count <= 6 && (
              <div className="text-[9px] text-zinc-300 mt-1 font-medium italic">
                  {kpi.sublabel}
              </div>
          )}
        </div>
      ))}
    </div>
  )
}