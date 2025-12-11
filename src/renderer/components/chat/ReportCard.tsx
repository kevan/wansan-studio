import React, { useState } from 'react'
import {
  Pin,
  ChevronRight,
  ChevronDown,
  Terminal,
  Sparkles,
  RefreshCw,
  Code,
} from 'lucide-react'
import { DashboardWidget } from '../DashboardWidget'
import { ReportData, useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { useChatStore } from '../../stores/useChatStore'
import { cn } from '../../utils/cn'
import { VizControls } from '../report/viz-controls'
import { SqlEditorModal } from '../report/sql-editor-modal'
import type { ChatMessage } from '../ChatInterface'
import { useTranslation } from 'react-i18next'

interface ReportCardProps {
  messageId: string
  message: ChatMessage
  reportData: ReportData
  className?: string
}

export function ReportCard({
  messageId,
  message,
  reportData,
  className,
}: ReportCardProps) {
  const [isLogicOpen, setIsLogicOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const pinReport = useWorkbenchStore(state => state.pinReport)
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const setReplyTo = useChatStore(state => state.setReplyTo)
  const updateReportConfig = useChatStore(state => state.updateReportConfig)
  const updateMessageData = useChatStore(state => state.updateMessageData)
  const rerunAnalysis = useChatStore(state => state.rerunAnalysis)
  const { t } = useTranslation('common')

  const isPinned = pinnedReports.some(r => r.sourceMessageId === messageId)

  const handlePin = () => {
    if (!isPinned) {
      window.dispatchEvent(new Event('wansan:open-dashboard'))
      pinReport(messageId, reportData, message.timestamp)
    }
  }

  const handleRunSql = async (newSql: string) => {
    const result = await window.electronAPI.runSQL(newSql)
    if (result.success && result.data) {
      const columns = result.data.length > 0 ? Object.keys(result.data[0]) : []
      updateMessageData(messageId, newSql, result.data, columns)
    } else {
      throw new Error(result.error || 'Execution failed')
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
        <div className="border-b border-zinc-100 bg-zinc-50/50">
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
            {t('view_logic')}
          </button>
          {isLogicOpen && (
            <div className="px-4 py-3 bg-zinc-50/50 space-y-3 animate-in slide-in-from-top-1 border-t border-zinc-100">
              {reportData.reasoning && (
                <div className="text-sm text-zinc-600 leading-relaxed py-3 whitespace-pre-wrap border-b border-zinc-100 last:border-0">
                  {reportData.reasoning}
                </div>
              )}
              {reportData.sql && (
                <div className="bg-white rounded-md p-3 overflow-x-auto border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2 border-b border-zinc-100 pb-2">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{t('generated_sql')}</span>
                  </div>
                  <pre className="text-xs text-zinc-700 font-mono">
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
          {t('analysis_report')}
        </span>
        <div className="flex items-center gap-2">
          <VizControls
            vizType={reportData.chartType}
            vizConfig={reportData.vizConfig}
            columns={reportData.columns}
            data={reportData.tableData}
            onChange={updates => updateReportConfig(messageId, updates)}
          />
          <button
            onClick={() => setIsEditorOpen(true)}
            className="p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            title="Edit SQL"
          >
            <Code className="h-3.5 w-3.5 text-zinc-500" />
            Code
          </button>
          <button
            onClick={() => rerunAnalysis(message)}
            className="p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            title={t('rerun_with_latest')}
          >
            <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
            {t('rerun')}
          </button>
          <button
            onClick={() => setReplyTo(messageId)}
            className="p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            title={t('refine')}
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
            {t('refine')}
          </button>
          <button
            onClick={handlePin}
            disabled={isPinned}
            className={cn(
              'p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium',
              isPinned
                ? 'text-orange-600 bg-orange-50 cursor-default'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            )}
            title={isPinned ? t('pinned_to_canvas') : t('pin_to_canvas')}
          >
            <Pin className="w-3.5 h-3.5" />
            {isPinned ? t('pinned') : t('pin')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <DashboardWidget
          {...reportData}
          variant="chat"
          timestamp={message.timestamp}
        />
      </div>

      <SqlEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        initialSql={reportData.sql || ''}
        onRun={handleRunSql}
      />
    </div>
  )
}
