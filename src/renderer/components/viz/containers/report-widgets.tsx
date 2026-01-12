import React from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ReportTitleEditor } from '../base/ReportTitleEditor'

// --- Section Header (Interactive) ---
export function ReportSectionHeader({ 
  report, 
  onRemove,
  readOnly
}: { 
  report: any
  onRemove?: () => void
  readOnly?: boolean
}) {
  const { t } = useTranslation('common')
  const reportData = report.reportData

  return (
    <div className="group relative mt-2 mb-4 border-b border-indigo-50 pb-2">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Section Number/Icon */}
        <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg sm:text-xl font-black shadow-lg shadow-indigo-200 select-none mt-1">
          #
        </div>
        
        {/* Editable Content */}
        <div className="flex-1 min-w-0 pt-1.5">
           <ReportTitleEditor 
              id={report.id} 
              content={reportData.content || ''} 
              readOnly={readOnly} // Dynamic readOnly
              className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight leading-none"
           />
        </div>

        {/* Controls */}
        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {onRemove && !readOnly && (
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