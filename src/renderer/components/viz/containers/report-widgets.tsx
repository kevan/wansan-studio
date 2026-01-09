import React from 'react'
import { cn } from '@/utils/cn'
import { KpiCard } from '../base/KpiCard'
import { useTranslation } from 'react-i18next'

// --- Section Header ---
export function ReportSectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mt-16 mb-8 border-b-2 border-indigo-100 pb-4">
      <h2 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-lg shadow-md shadow-indigo-200">
          #
        </span>
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-zinc-500 font-medium ml-11">{subtitle}</p>}
    </div>
  )
}

// --- KPI Row ---
export function ReportKpiRow({ reports }: { reports: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
      {reports.map(report => {
        const reportData = report.reportData
        const tableData = reportData.tableData || []
        const vizConfig = reportData.vizConfig
        
        // Extract Value logic same as KpiCard usage
        const yCol = Array.isArray(vizConfig?.y_axis)
            ? vizConfig.y_axis[0]
            : vizConfig?.y_axis
        const value = tableData[0] ? tableData[0][yCol || Object.keys(tableData[0])[0]] : '-'
        const label = yCol || Object.keys(tableData[0] || {})[0] || 'Metric'

        return (
          <div key={report.id} className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
             <div className="text-3xl font-black text-indigo-600 mb-2 font-mono tracking-tight">
                {typeof value === 'number' ? value.toLocaleString() : value}
             </div>
             <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {reportData.title || label}
             </div>
             {reportData.summary && (
                 <div className="mt-3 pt-3 border-t border-zinc-50 text-[10px] text-zinc-500 leading-tight">
                     {reportData.summary}
                 </div>
             )}
          </div>
        )
      })}
    </div>
  )
}
