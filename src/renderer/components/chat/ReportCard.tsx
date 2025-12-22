import React, { useState } from 'react'
import {
  Pin,
  Sparkles,
  RefreshCw,
  Code,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'
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
  onConfigure?: () => void
}

export function ReportCard({
  messageId,
  message,
  reportData,
  className,
  onConfigure,
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

  const rowCount = reportData.tableData?.length || 0
  const latency = message.metadata?.latency || 0

  return (
    <div
      className={cn(
        'flex flex-col border border-zinc-200 rounded-xl bg-white shadow-sm transition-all overflow-hidden h-full group',
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

      {/* Toolbar */}
      <div className="flex items-center justify-end px-3 py-2 border-t border-zinc-50 bg-white">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Viz Controls */}
          <VizControls
            vizType={reportData.chartType}
            vizConfig={reportData.vizConfig}
            columns={reportData.columns}
            data={reportData.tableData}
            onChange={updates => updateReportConfig(messageId, updates)}
          />

          {/* Modify Parameters Button */}
          {reportData.is_template && onConfigure && (
            <ExpandableAction
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              label="Params"
              onClick={onConfigure}
            />
          )}

          {/* Inspect Code & Logic Button */}
          <ExpandableAction
            icon={<Code className="h-3.5 w-3.5" />}
            label="Code"
            onClick={handleOpenSqlLab}
          />

          {/* Rerun Button */}
          <ExpandableAction
            icon={
              <RefreshCw
                className={cn('h-3.5 w-3.5', isRerunning && 'animate-spin')}
              />
            }
            label={t('rerun')}
            onClick={handleRerun}
            disabled={isRerunning}
          />

          {/* Refine Button */}
          <ExpandableAction
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label={t('refine')}
            onClick={() => setReplyTo(messageId)}
          />

          {/* Pin Button */}
          <ExpandableAction
            icon={
              <Pin
                className={cn(
                  'w-3.5 h-3.5',
                  isPinned && 'fill-current text-orange-600'
                )}
              />
            }
            label={isPinned ? t('pinned') : t('pin')}
            onClick={handlePinToggle}
            active={isPinned}
            className={
              isPinned ? 'text-orange-600 bg-orange-50 border-orange-100' : ''
            }
          />
        </div>
      </div>

      {/* Data Lineage Footer */}
      <div className="px-4 py-1.5 border-t border-zinc-50 bg-zinc-50/30 text-[10px] text-zinc-500 flex justify-between items-center select-none font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <span>Generated via DuckDB Local Engine</span>
        </div>
        <div className="font-mono tabular-nums opacity-70">
          {rowCount.toLocaleString()} rows processed in {latency.toFixed(0)}ms
        </div>
      </div>
    </div>
  )
}
