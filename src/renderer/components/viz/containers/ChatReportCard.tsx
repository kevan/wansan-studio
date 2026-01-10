import React, { useState, useCallback } from 'react'
import {
  Code,
  Pin,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Lightbulb,
} from 'lucide-react'
import { VizRenderer } from '../core/VizRenderer'
import { InsightPanel } from '../InsightPanel'
import {
  ReportData,
  useWorkbenchStore,
} from '../../../stores/useWorkbenchStore'
import { useChatStore } from '@/stores/useChatStore.ts'
import { useProjectStore } from '@/stores/useProjectStore.ts'
import { useSqlLabStore } from '@/stores/useSqlLabStore.ts'
import { useToastStore } from '@/stores/useToastStore.ts'
import { cn } from '@/utils/cn.ts'
import type { ChatMessage } from '../../ChatInterface'
import { useTranslation } from 'react-i18next'
import { ExpandableAction } from '../../ui/expandable-action'
import { useGenerateInsight } from '@/hooks/useIPC'


interface ChatReportCardProps {
  messageId: string
  message: ChatMessage
  reportData: ReportData
  className?: string
  onConfigure?: () => void
}

export const ChatReportCard = React.memo(function ChatReportCard({
  messageId,
  message,
  reportData: fallbackReportData,
  className,
  onConfigure,
}: ChatReportCardProps) {
  const pinReport = useWorkbenchStore(state => state.pinReport)
  const removeReport = useWorkbenchStore(state => state.removeReport)
  const pinnedReports = useWorkbenchStore(state => state.pinnedReports)
  const setEditingReportId = useWorkbenchStore(
    state => state.setEditingReportId
  )
  const setReplyTo = useChatStore(state => state.setReplyTo)
  const updateMessageData = useChatStore(state => state.updateMessageData)
  const updateMessageInsight = useChatStore(state => state.updateMessageInsight)
  const addToast = useToastStore(state => state.addToast)
  const openSqlLab = useSqlLabStore(state => state.open)
  const { t, i18n } = useTranslation(['common', 'chat'])
  const [isRerunning, setIsRerunning] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [manualActive, setManualActive] = useState(false)
  const [triggerCount, setTriggerCount] = useState(0)
  const [highlightedItems, setHighlightedItems] = useState<string[]>([])

  const generateInsight = useGenerateInsight()
  const language = i18n.language === 'zh' ? 'zh' : 'en'

  // 🔥 从 widgetRegistry 读取最新数据,实现响应式更新
  const widgetRegistry = useProjectStore(state => state.widgetRegistry)
  const reportData = message.widgetId && widgetRegistry[message.widgetId]
    ? widgetRegistry[message.widgetId]
    : fallbackReportData


  const handleDrillDown = useCallback(
    (
      action: 'focus' | 'view_data' | 'breakdown',
      payload: { name: string; dimension?: string }
    ) => {
      const { name, dimension } = payload
      const vizConfig = reportData.vizConfig
      const yAxisStr = Array.isArray(vizConfig?.y_axis)
        ? vizConfig.y_axis.join(', ')
        : vizConfig?.y_axis || 'metric'

      if (action === 'focus') {
        const displayMsg = `🔍 ${t('common:focus_analysis', { name })}`
        const hiddenMsg = `Filter the current analysis by ${name}. 
      CRITICAL CONSTRAINTS:
      - Maintain the current visualization metrics (aggregation).
      - DO NOT show raw data rows.
      - Keep the same chart type if possible.`
        setReplyTo(messageId)
        useChatStore.getState().sendMessage(displayMsg, hiddenMsg)
      } else if (action === 'view_data') {
        const displayMsg = `📄 ${t('common:view_raw_data', { name })}`
        const hiddenMsg = `Show the first 100 raw data rows for '${name}'.
        Constraint: Switch viz_type to 'table'.`
        setReplyTo(messageId)
        useChatStore.getState().sendMessage(displayMsg, hiddenMsg)
      } else if (action === 'breakdown' && dimension) {
        const displayMsg = `📊 ${t('common:breakdown_analysis', { dimension })}`
        const hiddenMsg = `Break down the metric (${yAxisStr}) by "${dimension}", filtered to "${name}".
        CRITICAL CONSTRAINTS:
        - Show aggregated values grouped by "${dimension}".
        - Prefer bar chart for the breakdown.
        - Keep the same measurement units.`
        setReplyTo(messageId)
        useChatStore.getState().sendMessage(displayMsg, hiddenMsg)
      }
    },
    [messageId, reportData.vizConfig, setReplyTo, t]
  )

  if (!reportData) return null

  const hasInsight = !!reportData.insight
  const showPanel = hasInsight || manualActive
  const isPinned = pinnedReports.some(r => r?.sourceMessageId === messageId)

  const handleInsightToggle = () => {
    if (hasInsight) {
      const next = !expanded
      setExpanded(next)
      if (!next) setHighlightedItems([])
    } else {
      if (!manualActive) {
        setManualActive(true)
        setTriggerCount(c => c + 1)
        setExpanded(true)
      } else {
        const next = !expanded
        setExpanded(next)
        if (!next) setHighlightedItems([])
      }
    }
  }

  const handleRerun = async () => {
    if (!reportData?.sql || isRerunning) return
    setIsRerunning(true)
    try {
      const result = await window.electronAPI.runSQL(reportData.sql)
      if (result.success && result.data) {
        const { data, columnFields } = result.data
        updateMessageData(messageId, reportData.sql, data, columnFields)
        addToast({
          type: 'success',
          title: t('common:refresh_success'),
        })
      } else {
        throw new Error(result.error || 'Execution failed')
      }
    } catch (e: any) {
      console.error(e)
      addToast({
        type: 'error',
        title: t('chat:error_analysis_failed'),
        description: t('common:refresh_failed_desc'),
      })
    } finally {
      setIsRerunning(false)
    }
  }

  const handleGenerateInsight = async (
    chartData: Array<Record<string, unknown>>
  ) => {
    const result = await generateInsight.mutateAsync({
      chartTitle: reportData.title || t('chat:analysis_result'),
      chartType: reportData.chartType || 'bar',
      aggregatedData: chartData,
      language,
    })
    updateMessageInsight(messageId, result)
    return result
  }

  const handlePinToggle = () => {
    if (isPinned) {
      const pinnedReport = pinnedReports.find(
        r => r?.sourceMessageId === messageId
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
    let editId = message.widgetId

    if (isPinned) {
      const pinned = pinnedReports.find(r => r?.sourceMessageId === messageId)
      if (pinned) editId = pinned.id
    }

    if (!editId) return

    setEditingReportId(editId)
    // ChartFullView is a fullscreen modal, no need to open dashboard panel
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
    if (!reportData?.sql) return
    openSqlLab({
      mode: 'widget',
      targetId: messageId,
      targetTitle: reportData.title,
      initialSql: reportData.sql,
      reasoning: reportData.reasoning,
      onSave: handleRunSql,
    })
  }

  const rowCount = reportData?.tableData?.length || 0

  return (
    <div
      className={cn(
        'flex flex-col border border-zinc-200 rounded-xl bg-white shadow-sm transition-all overflow-hidden h-full group',
        className
      )}
    >
      <div className="flex-1 min-h-0">
        {reportData && (
          <VizRenderer
            {...reportData}
            variant="chat"
            timestamp={message.timestamp}
            messageId={messageId}
            highlightedItems={highlightedItems}
            onDrillDownAction={handleDrillDown}
          />
        )}
      </div>

      {showPanel && (
        <div className="border-t border-zinc-100 bg-zinc-50/30 p-3">
          <InsightPanel
            title={reportData.title}
            chartType={reportData.chartType}
            chartData={reportData.tableData || []}
            insight={reportData.insight}
            onGenerateInsight={handleGenerateInsight}
            expanded={expanded}
            onExpandChange={val => {
              setExpanded(val)
              if (!val) setHighlightedItems([])
            }}
            hiddenIfIdle={true}
            requestTrigger={triggerCount}
            onCancel={() => {
              setManualActive(false)
              setExpanded(false)
            }}
            readOnly={true}
          />
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-50 bg-white">
        {/* Left: AI Insight Trigger */}
        <div>
          {!hasInsight && !manualActive && (
            <button
              onClick={handleInsightToggle}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100"
            >
              <Lightbulb className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-medium">{t('ai_insight')}</span>
            </button>
          )}
        </div>

        {/* Right: Standard Actions */}
        <div className="flex items-center gap-1">
          <ExpandableAction
            icon={<Settings2 className="h-3.5 w-3.5" />}
            label={t('common:edit_viz')}
            onClick={handleEditViz}
          />

          {reportData?.is_template && onConfigure && (
            <ExpandableAction
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              label={t('chat:modify_parameters')}
              onClick={onConfigure}
            />
          )}

          <ExpandableAction
            icon={<Code className="h-3.5 w-3.5" />}
            label={t('common:inspect_code')}
            onClick={handleOpenSqlLab}
          />

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

          <ExpandableAction
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label={t('chat:refine')}
            onClick={() => setReplyTo(messageId)}
          />

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
})
