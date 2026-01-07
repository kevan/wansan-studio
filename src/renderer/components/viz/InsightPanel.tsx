import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { cn } from '@/utils/cn'

type InsightState = 'idle' | 'consent' | 'analyzing' | 'done' | 'error'

interface InsightPanelProps {
  /** Chart title for context */
  title?: string
  /** Aggregated chart data (what will be sent to AI) */
  chartData: Array<Record<string, unknown>>
  /** Chart type for context */
  chartType?: string
  /** Called to request AI insight generation */
  onGenerateInsight: (data: Array<Record<string, unknown>>) => Promise<string>
  className?: string
}

export function InsightPanel({
  title = 'Chart',
  chartData,
  chartType = 'bar',
  onGenerateInsight,
  className,
}: InsightPanelProps) {
  const { t } = useTranslation('common')
  const [state, setState] = useState<InsightState>('idle')
  const [isExpanded, setIsExpanded] = useState(false)
  const [insightText, setInsightText] = useState<string>('')
  const [error, setError] = useState<string>('')

  const dataPointCount = chartData.length

  const handleRequestInsight = useCallback(() => {
    setState('consent')
  }, [])

  const handleConfirmSend = useCallback(async () => {
    setState('analyzing')
    setError('')
    try {
      const result = await onGenerateInsight(chartData)
      setInsightText(result)
      setState('done')
      setIsExpanded(true)
    } catch (err: any) {
      setError(err.message || 'Failed to generate insight')
      setState('error')
    }
  }, [chartData, onGenerateInsight])

  const handleCancel = useCallback(() => {
    setState('idle')
  }, [])

  // Render based on state
  if (state === 'idle') {
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

            {/* Data Preview */}
            <div className="mt-3 bg-white/80 rounded-lg p-2 border border-amber-100 max-h-32 overflow-auto">
              <pre className="text-[10px] text-zinc-600 font-mono">
                {JSON.stringify(chartData.slice(0, 5), null, 2)}
                {chartData.length > 5 && '\n...'}
              </pre>
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
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium text-indigo-700">
            {t('ai_insight') || 'AI Insight'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-indigo-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-indigo-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="prose prose-sm prose-zinc max-w-none text-sm text-zinc-700 leading-relaxed">
            {insightText.split('\n').map((line, i) => (
              <p key={i} className="my-1">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
