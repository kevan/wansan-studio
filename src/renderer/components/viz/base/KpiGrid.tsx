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
  /** Items to highlight (for visual anchoring) */
  highlightedItems?: string[]
}

export function KpiGrid({
  reportData,
  widgets,
  variant = 'chat',
  className,
  highlightedItems = [],
}: KpiGridProps) {
  const kpis: Array<{ id: string; label: string; value: any; sublabel?: string }> = []
// ...
  const styles = getFontStyles()

  return (
    <div className={cn('grid gap-4 w-full', getGridCols(), className)}>
      {kpis.map(kpi => {
        const isHighlighted = highlightedItems.includes(kpi.label)
        
        return (
          <div 
            key={kpi.id} 
            className={cn(
              "bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col items-center justify-center text-center relative overflow-hidden",
              count <= 2 ? "min-h-[160px]" : "min-h-[120px]",
              isHighlighted && "ring-2 ring-indigo-500 border-transparent shadow-xl scale-[1.02] z-10"
            )}
          >
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full bg-indigo-500 transition-opacity",
                isHighlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )} />
            
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
        )
      })}
    </div>
  )
}