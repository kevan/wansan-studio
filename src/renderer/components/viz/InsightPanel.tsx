import React, { useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { SimpleMarkdown } from '../ui/simple-markdown'
import type { InsightResult } from '@shared/types/dashboard'

type InsightState = 'idle' | 'consent' | 'analyzing' | 'done' | 'error'

interface InsightPanelProps {
  /** Chart title for context */
  title?: string
  /** Aggregated chart data (what will be sent to AI) */
  chartData: Array<Record<string, unknown>>
  /** Chart type for context */
  chartType?: string
  /** Existing insight text if available */
  insight?: string | InsightResult
  /** Called to request AI insight generation */
  onGenerateInsight: (
    data: Array<Record<string, unknown>>
  ) => Promise<InsightResult | string>
  className?: string
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandChange?: (expanded: boolean) => void
  hiddenIfIdle?: boolean
  requestTrigger?: number
  onCancel?: () => void
  onRemove?: () => void
  /** Called when hovering over a finding to highlight chart elements */
  onHighlight?: (items: string[]) => void
}

export function InsightPanel({
  title = 'Chart',
  chartData,
  chartType = 'bar',
  insight,
  onGenerateInsight,
  className,
  expanded,
  defaultExpanded = false,
  onExpandChange,
  requestTrigger = 0,
  hiddenIfIdle = false,
  onCancel,
  onRemove,
  onHighlight,
}: InsightPanelProps) {
  const { t, i18n } = useTranslation('common')
  const [state, setState] = useState<InsightState>(insight ? 'done' : 'idle')
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const [insightData, setInsightData] = useState<string | InsightResult>(
    insight || ''
  )
  const [error, setError] = useState<string>('')

  const isExpanded = expanded !== undefined ? expanded : internalExpanded
  const dataPointCount = chartData.length

  useEffect(() => {
    if (insight) {
      setInsightData(insight)
      setState('done')
      if (expanded === undefined && !internalExpanded) {
        setInternalExpanded(true)
      }
    } else {
      // If insight removed externally
      if (state === 'done') {
        setState('idle')
        setInsightData('')
      }
    }
  }, [insight])

  // Auto request logic
  useEffect(() => {
    if (requestTrigger > 0 && state === 'idle' && !insight) {
      setState('consent')
    }
  }, [requestTrigger, state, insight])

  // Sync internal expanded state if prop changes
  useEffect(() => {
    if (expanded !== undefined) {
      setInternalExpanded(expanded)
    }
  }, [expanded])

  const toggleExpanded = () => {
    const next = !isExpanded
    if (onExpandChange) {
      onExpandChange(next)
    }
    setInternalExpanded(next)
  }

  const handleRequestInsight = useCallback(() => {
    setState('consent')
  }, [])

  const handleConfirmSend = useCallback(async () => {
    setState('analyzing')
    setError('')
    try {
      const result = await onGenerateInsight(chartData)
      setInsightData(result)
      setState('done')
      setInternalExpanded(true)
      onExpandChange?.(true)
    } catch (err: any) {
      setError(err.message || 'Failed to generate insight')
      setState('error')
    }
  }, [chartData, onGenerateInsight, onExpandChange])

  const handleRegenerate = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      handleConfirmSend()
    },
    [handleConfirmSend]
  )

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onRemove) {
        onRemove()
        setState('idle')
        setInsightData('')
      }
    },
    [onRemove]
  )

  const handleCancel = useCallback(() => {
    setState('idle')
    onCancel?.()
  }, [onCancel])

  const renderSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return (
          <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
        )
      case 'negative':
        return (
          <TrendingDown className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
        )
      default:
        return <Minus className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
    }
  }

  const renderContent = () => {
    if (typeof insightData === 'string') {
      return <SimpleMarkdown content={insightData} />
    }
    if (!insightData) return null

    const { summary, findings, recommendation } = insightData as InsightResult
    const language = i18n.language

    return (
      <div className="space-y-4 pt-1">
        {/* Summary */}
        {summary && (
          <div className="text-sm text-zinc-700 font-medium leading-relaxed bg-white/60 p-3 rounded-lg border border-indigo-50/50 shadow-sm">
            {summary}
          </div>
        )}

        {/* Findings */}
        {findings && findings.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">
              {language === 'zh' ? '关键发现' : 'Key Findings'}
            </div>
            <ul className="space-y-1">
              {findings.map((item, idx) => (
                <li
                  key={item.id || idx}
                  className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-md hover:ring-1 hover:ring-indigo-100 transition-all duration-200 cursor-default"
                  onMouseEnter={() => onHighlight?.(item.relatedItems || [])}
                  onMouseLeave={() => onHighlight?.([])}
                >
                  {renderSentimentIcon(item.sentiment)}
                  <div className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors flex-1">
                    <SimpleMarkdown
                      content={item.markdown}
                      className="prose-p:my-0 prose-p:leading-relaxed"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        {recommendation && (
          <div className="flex items-start gap-3 p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-lg">
            <Lightbulb className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-emerald-800 leading-relaxed font-medium">
              {recommendation}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render based on state
  if (state === 'idle') {
    if (hiddenIfIdle) return null
    return (
      <button
        onClick={handleRequestInsight}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors',
          className
        )}
      >
        <Sparkles className="w-4 h-4" />
        <span>{t('ai_insight') || 'AI Insight'}</span>
      </button>
    )
  }

  if (state === 'consent') {
    return (
      <div
        className={cn(
          'border border-amber-200 bg-amber-50/50 rounded-xl p-4',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-800">
              {t('insight_consent_title') || 'Send Data to AI?'}
            </div>
            <div className="text-xs text-amber-700 mt-1">
              {t('insight_consent_desc', { count: dataPointCount }) ||
                `This will send ${dataPointCount} aggregated data points to generate insights. No raw data rows will be transmitted.`}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleConfirmSend}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                {t('confirm_send') || 'Send & Analyze'}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                {t('cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'analyzing') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl',
          className
        )}
      >
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        <span className="text-sm text-indigo-700">
          {t('analyzing') || 'Analyzing data...'}
        </span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 bg-red-50/50 border border-red-100 rounded-xl',
          className
        )}
      >
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <span className="text-sm text-red-700">{error}</span>
        <button
          onClick={handleCancel}
          className="ml-auto text-xs text-red-600 hover:text-red-800"
        >
          {t('dismiss') || 'Dismiss'}
        </button>
      </div>
    )
  }

  // state === 'done'
  return (
    <div
      className={cn(
        'border border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-white rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-indigo-50/50 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium text-indigo-700">
            {t('ai_insight') || 'AI Insight'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isExpanded && (
            <>
              <button
                onClick={handleRegenerate}
                className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded bg-transparent transition-colors"
                title={t('regenerate') || 'Regenerate'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              {onRemove && (
                <button
                  onClick={handleRemove}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded bg-transparent transition-colors"
                  title={t('remove') || 'Remove'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="w-[1px] h-3 bg-zinc-200 mx-1" />
            </>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-indigo-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-indigo-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && <div className="px-4 pb-4">{renderContent()}</div>}
    </div>
  )
}
