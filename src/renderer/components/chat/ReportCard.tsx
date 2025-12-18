import React, { useState } from 'react'
import { Pin, Sparkles, RefreshCw, Code, Settings2 } from 'lucide-react'
import { DashboardWidget } from '../DashboardWidget'
import { ReportData, useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { useChatStore } from '../../stores/useChatStore'
import { cn } from '../../utils/cn'
import { SqlEditorModal } from '../report/sql-editor-modal'
import type { ChatMessage } from '../ChatInterface'
import { useTranslation } from 'react-i18next'
import { VizControls } from '@/components/report/viz-controls'

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
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const setReplyTo = useChatStore(state => state.setReplyTo)
  const updateReportConfig = useChatStore(state => state.updateReportConfig)
  const updateMessageData = useChatStore(state => state.updateMessageData)
  const rerunAnalysis = useChatStore(state => state.rerunAnalysis)
  const { t } = useTranslation('common')

  const isPinned = pinnedReports.some(r => r.sourceMessageId === messageId)

  const handlePinToggle = () => {
    if (isPinned) {
      const pinnedReport = pinnedReports.find(
        r => r.sourceMessageId === messageId
      )
      if (pinnedReport) {
        removeReport(pinnedReport.id)
      }
    } else {
      window.dispatchEvent(new Event('wansan:open-dashboard'))
      pinReport(messageId, reportData, message.timestamp, message.widgetId)
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
        'flex flex-col border border-zinc-200 rounded-lg bg-background shadow-sm transition-all overflow-hidden h-full',
        className
      )}
    >
      {/* Content */}
      <div className="flex-1 min-h-0">
        <DashboardWidget
          {...reportData}
          variant="chat"
          timestamp={message.timestamp}
        />
      </div>

      {/* Compact Toolbar Footer */}
      <div className="flex items-center justify-between p-3 border-t bg-zinc-50/50">
        {/* Timestamp & Latency */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 tabular-nums">
            {message.timestamp
              ? new Date(message.timestamp).toLocaleString()
              : ''}
          </span>

          {/* Execution Latency Badge */}
          {message.metadata?.latency && (
            <span
              className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded-sm tabular-nums"
              title="总执行时间 (AI + SQL)"
            >
              ⚡ {(message.metadata.latency / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1">
          {/* Viz Controls */}
          <VizControls
            vizType={reportData.chartType}
            vizConfig={reportData.vizConfig}
            columns={reportData.columns}
            data={reportData.tableData}
            onChange={updates => updateReportConfig(messageId, updates)}
          />

          {/* Inspect Code & Logic Button */}
          <button
            onClick={() => setIsEditorOpen(true)}
            className="p-1.5 rounded-md transition-colors hover:bg-zinc-200"
            title="Inspect Code & Logic"
          >
            <Code className="h-4 w-4 text-zinc-500" />
          </button>

          {/* Rerun Button */}
          <button
            onClick={() => rerunAnalysis(message)}
            className="p-1.5 rounded-md transition-colors hover:bg-zinc-200"
            title={t('rerun_with_latest')}
          >
            <RefreshCw className="h-4 w-4 text-zinc-500" />
          </button>

          {/* Refine Button */}
          <button
            onClick={() => setReplyTo(messageId)}
            className="p-1.5 rounded-md transition-colors hover:bg-zinc-200"
            title={t('refine')}
          >
            <Sparkles className="h-4 w-4 text-zinc-500" />
          </button>

          {/* Pin Button */}
          <button
            onClick={handlePinToggle}
            className={cn(
              'p-1.5 rounded-md transition-colors hover:bg-zinc-200'
            )}
            title={isPinned ? t('unpin_from_canvas') : t('pin_to_canvas')}
          >
            <Pin
              className={cn(
                'w-4 h-4',
                isPinned ? 'fill-current text-orange-600' : 'text-zinc-500'
              )}
            />
          </button>
        </div>
      </div>

      {/* Modal */}
      <SqlEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        initialSql={reportData.sql || ''}
        reasoning={reportData.reasoning}
        onRun={handleRunSql}
      />
    </div>
  )
}
