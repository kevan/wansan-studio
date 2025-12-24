import React, { useState } from 'react'
import {
  Code,
  Pin,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { DashboardWidget } from '../DashboardWidget'
import { ReportData, useWorkbenchStore } from '../../stores/useWorkbenchStore'
import { useChatStore } from '@/stores/useChatStore.ts'
import { useSqlLabStore } from '@/stores/useSqlLabStore.ts'
import { useToastStore } from '@/stores/useToastStore.ts'
import { cn } from '@/utils/cn.ts'
import type { ChatMessage } from '../ChatInterface'
import { useTranslation } from 'react-i18next'
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
  const pinReport = useWorkbenchStore(state => state.pinReport)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const setEditingReportId = useWorkbenchStore(state => state.setEditingReportId)
  const setReplyTo = useChatStore(state => state.setReplyTo)
  const updateMessageData = useChatStore(state => state.updateMessageData)
  const addToast = useToastStore(state => state.addToast)
  const openSqlLab = useSqlLabStore(state => state.open)
  const { t } = useTranslation(['common', 'chat'])
  const [isRerunning, setIsRerunning] = useState(false)

  const isPinned = pinnedReports.some(r => r.sourceMessageId === messageId)

  const handleRerun = async () => {
    if (!reportData.sql || isRerunning) return
    setIsRerunning(true)
    try {
      const result = await window.electronAPI.runSQL(reportData.sql)
      if (result.success && result.data) {
        const { data, columnFields } = result.data
        updateMessageData(messageId, reportData.sql, data, columnFields)
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
        description: t(
          'refresh_failed_desc',
          'Unable to refresh data. Please check your data source or SQL.'
        ),
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

  const handleEditViz = () => {
    // Determine which ID to use for editing
    let editId = message.widgetId

    if (isPinned) {
      const pinned = pinnedReports.find(r => r.sourceMessageId === messageId)
      if (pinned) editId = pinned.id
    }

    if (!editId) return

    setEditingReportId(editId)
    window.dispatchEvent(new Event('wansan:open-dashboard'))
  }

  const handleRunSql = async (newSql: string) => {
    const result = await window.electronAPI.runSQL(newSql)
    if (result.success && result.data) {
      const { data, columnFields } = result.data
      updateMessageData(messageId, newSql, data, columnFields)
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
      reasoning: reportData.reasoning,
      onSave: handleRunSql,
    })
  }

  const rowCount = reportData.tableData?.length || 0
  const aiLatency = message.metadata?.aiLatency || 0
  const dbLatency =
    message.metadata?.dbLatency || message.metadata?.latency || 0

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
          messageId={messageId}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end px-3 py-2 border-t border-zinc-50 bg-white">
        <div className="flex items-center gap-1">
          {/* Edit Viz Button (Replaces inline VizControls) */}
          <ExpandableAction
            icon={<Settings2 className="h-3.5 w-3.5" />}
            label={t('common:edit_viz')}
            onClick={handleEditViz}
          />

          {/* Modify Parameters Button */}
          {reportData.is_template && onConfigure && (
            <ExpandableAction
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              label={t('chat:modify_parameters')}
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
            label={t('chat:rerun')}
            onClick={handleRerun}
            disabled={isRerunning}
          />

          {/* Refine Button */}
          <ExpandableAction
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label={t('chat:refine')}
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
            label={isPinned ? t('chat:pinned') : t('chat:pin')}
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
          <span>{t('chat:lineage_engine')}</span>
        </div>
        <div className="font-mono tabular-nums opacity-70 flex gap-2">
          <span>
            {t('chat:lineage_stats', { rowCount: rowCount.toLocaleString() })}
          </span>
          <span className="opacity-40">|</span>
          <span>
            {message.metadata?.aiLatency !== undefined &&
            message.metadata?.dbLatency !== undefined
              ? t('chat:lineage_latency_split', {
                  aiLatency: message.metadata.aiLatency.toFixed(0),
                  dbLatency: message.metadata.dbLatency.toFixed(0),
                })
              : t('chat:lineage_latency_total', {
                  latency: (message.metadata?.latency || 0).toFixed(0),
                })}
          </span>
        </div>
      </div>
    </div>
  )
}
