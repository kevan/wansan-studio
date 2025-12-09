import React, { useState } from 'react'
import {
  Pin,
  ChevronRight,
  ChevronDown,
  Terminal,
  Sparkles,
} from 'lucide-react'
import { DashboardWidget } from '../DashboardWidget'
import { ReportData, useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { cn } from '../../utils/cn'

interface ReportCardProps {
  messageId: string
  reportData: ReportData
  className?: string
}

export function ReportCard({
  messageId,
  reportData,
  className,
}: ReportCardProps) {
  const [isLogicOpen, setIsLogicOpen] = useState(false)
  const pinReport = useWorkbenchStore(state => state.pinReport)
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)

  const isPinned = pinnedReports.some(r => r.sourceMessageId === messageId)

  const handlePin = () => {
    if (!isPinned) {
      pinReport(messageId, reportData)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col border border-zinc-200 rounded-lg bg-white shadow-sm transition-all overflow-hidden h-full',
        className
      )}
    >
      {/* Logic Section (Collapsible) */}
      {(reportData.sql || reportData.reasoning) && (
        <div className="border-b border-zinc-100 bg-zinc-50/30">
          <button
            onClick={() => setIsLogicOpen(!isLogicOpen)}
            className="flex items-center gap-2 px-4 py-2 w-full text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
          >
            {isLogicOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            View Analysis Logic
          </button>
          {isLogicOpen && (
            <div className="px-4 py-3 bg-zinc-50 space-y-3 animate-in slide-in-from-top-1 border-t border-zinc-100">
              {reportData.reasoning && (
                <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {reportData.reasoning}
                </div>
              )}
              {reportData.sql && (
                <div className="bg-zinc-100 rounded-md p-3 overflow-x-auto border border-zinc-200">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2 border-b border-zinc-200 pb-2">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Generated SQL</span>
                  </div>
                  <pre className="text-xs text-zinc-800 font-mono">
                    <code>{reportData.sql}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toolbar Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-white">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Analysis Report
        </span>
        <button
          onClick={handlePin}
          disabled={isPinned}
          className={cn(
            'p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium',
            isPinned
              ? 'text-orange-600 bg-orange-50 cursor-default'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
          )}
          title={isPinned ? 'Pinned to Canvas' : 'Pin to Canvas'}
        >
          <Pin className="w-3.5 h-3.5" />
          {isPinned ? 'Pinned' : 'Pin'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <DashboardWidget {...reportData} variant="chat" />
      </div>
    </div>
  )
}
