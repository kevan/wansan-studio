import React, { useState } from 'react'
import { cn } from '@/utils/cn'
import { ReportTitleEditor } from '../base/ReportTitleEditor'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// --- Section Header (Interactive) ---
export function ReportSectionHeader({ 
  report, 
  onRemove 
}: { 
  report: any
  onRemove?: () => void 
}) {
  const { t } = useTranslation('common')
  const reportData = report.reportData

  return (
    <div className="group relative mt-4 mb-8 border-b-2 border-indigo-50 pb-4">
      <div className="flex items-start gap-4">
        {/* Section Number/Icon */}
        <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-200 select-none mt-1">
          #
        </div>
        
        {/* Editable Content */}
        <div className="flex-1 min-w-0 pt-1.5">
           <ReportTitleEditor 
              id={report.id} 
              content={reportData.content || ''} 
              readOnly={false} // Allow editing
              className="text-3xl font-black text-zinc-900 tracking-tight leading-none"
           />
        </div>

        {/* Controls */}
        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title={t('remove_from_dashboard')}
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>
    </div>
  )
}

// --- KPI Row ---
export function ReportKpiRow({ reports }: { reports: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
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
          <div key={report.id} className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group cursor-default">
             <div className="text-3xl font-black text-indigo-600 mb-2 font-mono tracking-tight group-hover:scale-110 transition-transform duration-300">
                {typeof value === 'number' ? value.toLocaleString() : value}
             </div>
             <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
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