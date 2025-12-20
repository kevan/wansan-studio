import React, { useState } from 'react'
import { Pin, Sparkles, RefreshCw, Code, Settings2 } from 'lucide-react'
import { DashboardWidget } from '../DashboardWidget'
import { ReportData, useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { useChatStore } from '../../stores/useChatStore'
import { useSqlLabStore } from '../../stores/useSqlLabStore'
import { useToastStore } from '../../stores/useToastStore'
import { useProjectStore } from '../../stores/useProjectStore'
import { cn } from '../../utils/cn'
import { SqlEditorModal } from '../report/sql-editor-modal'
import type { ChatMessage } from '../ChatInterface'
import { useTranslation } from 'react-i18next'
import { VizControls } from '@/components/report/viz-controls'
import { ExpandableAction } from '../ui/expandable-action'

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
  const pinReport = useWorkbenchStore(state => state.pinReport)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const setReplyTo = useChatStore(state => state.setReplyTo)
  const updateReportConfig = useChatStore(state => state.updateReportConfig)
  const updateMessageData = useChatStore(state => state.updateMessageData)
  const addToast = useToastStore(state => state.addToast)
  const openSqlLab = useSqlLabStore(state => state.open)
  const { t } = useTranslation('common')
  const [isRerunning, setIsRerunning] = useState(false)

  const isPinned = pinnedReports.some(r => r.sourceMessageId === messageId)

  const handleRerun = async () => {
    if (!reportData.sql || isRerunning) return
    setIsRerunning(true)
    try {
      const result = await window.electronAPI.runSQL(reportData.sql)
      if (result.success && result.data) {
        const data = result.data.data
        const columns = data.length > 0 ? Object.keys(data[0]) : []
        updateMessageData(messageId, reportData.sql, data, columns, result.data.columnTypes)
        addToast({
          type: 'success',
          title: t('refresh_success', 'Data refreshed'),
        })
      } else {
        throw new Error(result.error || 'Execution failed')
      }
    } catch (e: any) {
      console.error(e)
      addToast({
        type: 'error',
        title: t('execution_failed', 'Execution Failed'),
        description: t('refresh_failed_desc', 'Unable to refresh data. Please check your data source or SQL.'),
      })
    } finally {
      setIsRerunning(false)
    }
  }

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
      const data = result.data.data
      const columns = data.length > 0 ? Object.keys(data[0]) : []
      updateMessageData(messageId, newSql, data, columns, result.data.columnTypes)
    } else {
      throw new Error(result.error || 'Execution failed')
    }
  }

  const handleOpenSqlLab = () => {
    if (!reportData.sql) return
    openSqlLab({
      mode: 'widget',
      targetId: messageId,
      targetTitle: reportData.title,
      initialSql: reportData.sql,
      initialColumns: reportData.columns,
      initialColumnTypes: reportData.columnTypes,
      onSave: handleRunSql,
    })
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
          <ExpandableAction
            icon={<Code className="h-4 w-4" />}
            label="Code"
            onClick={handleOpenSqlLab}
          />

          {/* Rerun Button */}
          <ExpandableAction
            icon={
              <RefreshCw
                className={cn('h-4 w-4', isRerunning && 'animate-spin')}
              />
            }
            label={t('rerun')}
            onClick={handleRerun}
            disabled={isRerunning}
          />

          {/* Refine Button */}
          <ExpandableAction
            icon={<Sparkles className="h-4 w-4" />}
            label={t('refine')}
            onClick={() => setReplyTo(messageId)}
          />

          {/* Pin Button */}
          <ExpandableAction
            icon={
              <Pin
                className={cn(
                  'w-4 h-4',
                  isPinned && 'fill-current text-orange-600'
                )}
              />
            }
            label={isPinned ? t('pinned') : t('pin')}
            onClick={handlePinToggle}
            active={isPinned}
            className={isPinned ? 'text-orange-600 bg-orange-50 border-orange-100' : ''}
          />
        </div>
      </div>
    </div>
  )
}
