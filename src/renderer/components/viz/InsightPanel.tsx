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
  Rocket,
  Target,
  Info,
  Plus,
  Edit2,
  Save,
  X as CloseIcon,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { SimpleMarkdown } from '../ui/simple-markdown'
import type { InsightResult } from '@shared/types/dashboard'
import TextareaAutosize from 'react-textarea-autosize'

type InsightState = 'idle' | 'consent' | 'analyzing' | 'done' | 'error'

const SENTIMENT_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  positive: { icon: TrendingUp, color: 'text-emerald-500', label: 'Positive' },
  negative: { icon: TrendingDown, color: 'text-rose-500', label: 'Negative' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', label: 'Warning' },
  growth: { icon: Rocket, color: 'text-blue-500', label: 'Growth' },
  discovery: { icon: Sparkles, color: 'text-purple-500', label: 'Discovery' },
  target: { icon: Target, color: 'text-indigo-500', label: 'Target' },
  info: { icon: Info, color: 'text-zinc-500', label: 'Info' },
  neutral: { icon: Minus, color: 'text-zinc-400', label: 'Neutral' },
}

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
  onSave?: (insight: InsightResult) => void
  /** Called when hovering over a finding to highlight chart elements */
  onHighlight?: (items: string[]) => void
  readOnly?: boolean
}

export function InsightPanel({
  chartData,
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
  onSave,
  readOnly = false,
}: InsightPanelProps) {
  const { t, i18n } = useTranslation('common')
  const [state, setState] = useState<InsightState>(insight ? 'done' : 'idle')
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const [insightData, setInsightData] = useState<InsightResult | null>(
    typeof insight === 'string' ? null : (insight as InsightResult) || null
  )
  const [error, setError] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editBuffer, setEditEditBuffer] = useState<InsightResult | null>(null)

  const isExpanded = expanded !== undefined ? expanded : internalExpanded
  const dataPointCount = chartData.length

  useEffect(() => {
    if (insight && typeof insight !== 'string') {
      setInsightData(insight)
      setState('done')
      if (expanded === undefined && !internalExpanded) {
        setInternalExpanded(true)
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
    if (isEditing) return
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
      const data = typeof result === 'string' ? null : result
      setInsightData(data)
      setState('done')
      setInternalExpanded(true)
      onExpandChange?.(true)
    } catch (err: any) {
      setError(err.message || 'Failed to generate insight')
      setState('error')
    }
  }, [chartData, onGenerateInsight, onExpandChange])

  const handleStartEdit = () => {
    setEditEditBuffer(JSON.parse(JSON.stringify(insightData || {
        summary: '',
        findings: [],
        recommendation: ''
    })))
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditEditBuffer(null)
  }

  const handleSaveEdit = () => {
    if (editBuffer && onSave) {
      onSave(editBuffer)
      setInsightData(editBuffer)
    }
    setIsEditing(false)
  }

  const updateFinding = (id: string, updates: any) => {
    if (!editBuffer) return
    setEditEditBuffer({
      ...editBuffer,
      findings: editBuffer.findings.map(f => (f.id === id ? { ...f, ...updates } : f)),
    })
  }

  const addFinding = () => {
    if (!editBuffer) return
    const newFinding = {
      id: crypto.randomUUID(),
      markdown: '',
      sentiment: 'neutral' as const,
      relatedItems: [],
    }
    setEditEditBuffer({
      ...editBuffer,
      findings: [...editBuffer.findings, newFinding],
    })
  }

  const removeFinding = (id: string) => {
    if (!editBuffer) return
    setEditEditBuffer({
      ...editBuffer,
      findings: editBuffer.findings.filter(f => f.id !== id),
    })
  }

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
        setInsightData(null)
      }
    },
    [onRemove]
  )

  const handleCancel = useCallback(() => {
    setState('idle')
    onCancel?.()
  }, [onCancel])

  const renderSentimentIcon = (sentiment?: string) => {
    const config = SENTIMENT_ICONS[sentiment || 'neutral'] || SENTIMENT_ICONS.neutral
    const Icon = config.icon
    return <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
  }

  const renderEditForm = () => {
    if (!editBuffer) return null
    const language = i18n.language

    return (
      <div className="space-y-6 pt-2 pb-4">
        {/* Summary Edit */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">
            {language === 'zh' ? '概览' : 'Summary'}
          </label>
          <TextareaAutosize
            value={editBuffer.summary}
            onChange={e => setEditEditBuffer({ ...editBuffer, summary: e.target.value })}
            placeholder="Main conclusion..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>

        {/* Findings Edit */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              {language === 'zh' ? '关键发现' : 'Key Findings'}
            </label>
            <button
              onClick={addFinding}
              className="p-1 hover:bg-indigo-50 text-indigo-600 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {editBuffer.findings.map(f => (
              <div key={f.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 relative group/finding">
                <div className="flex gap-3">
                  {/* Icon Picker */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="grid grid-cols-4 gap-1 p-1 bg-white border border-zinc-100 rounded-lg shadow-sm">
                      {Object.entries(SENTIMENT_ICONS).map(([key, config]) => {
                        const Icon = config.icon
                        const isActive = f.sentiment === key
                        return (
                          <button
                            key={key}
                            onClick={() => updateFinding(f.id, { sentiment: key })}
                            className={cn(
                              'p-1.5 rounded transition-all',
                              isActive ? 'bg-zinc-100 shadow-inner' : 'hover:bg-zinc-50 opacity-40 hover:opacity-100'
                            )}
                            title={config.label}
                          >
                            <Icon className={cn('w-3.5 h-3.5', config.color)} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <TextareaAutosize
                      value={f.markdown}
                      onChange={e => updateFinding(f.id, { markdown: e.target.value })}
                      placeholder="Observation details..."
                      className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 outline-none resize-none"
                    />
                    
                    {/* Related Items Edit */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase mr-1">Anchors:</span>
                        {f.relatedItems?.map(item => (
                            <div key={item} className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded border border-indigo-100">
                                {item}
                                <button 
                                    onClick={() => updateFinding(f.id, { relatedItems: f.relatedItems?.filter(i => i !== item) })}
                                    className="hover:text-rose-500 ml-1"
                                >
                                    <CloseIcon className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        ))}
                        <select 
                            className="bg-transparent border-none text-[10px] text-zinc-400 focus:ring-0 outline-none cursor-pointer hover:text-indigo-600"
                            onChange={(e) => {
                                if (e.target.value && !f.relatedItems?.includes(e.target.value)) {
                                    updateFinding(f.id, { relatedItems: [...(f.relatedItems || []), e.target.value] })
                                }
                                e.target.value = ''
                            }}
                        >
                            <option value="">+ Add Anchor</option>
                            {Array.from(new Set(chartData.map(d => String(Object.values(d)[0])))).map(val => (
                                <option key={val} value={val}>{val}</option>
                            ))}
                        </select>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFinding(f.id)}
                  className="absolute -right-2 -top-2 w-6 h-6 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 shadow-sm opacity-0 group-hover/finding:opacity-100 transition-opacity"
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation Edit */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">
            {language === 'zh' ? '建议' : 'Recommendation'}
          </label>
          <TextareaAutosize
            value={editBuffer.recommendation}
            onChange={e => setEditEditBuffer({ ...editBuffer, recommendation: e.target.value })}
            placeholder="Actionable suggestion..."
            className="w-full bg-emerald-50/30 border border-emerald-100/50 rounded-lg p-3 text-sm text-emerald-900 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 mt-4">
            <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
            >
                {t('cancel')}
            </button>
            <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
                <Save className="w-3.5 h-3.5" />
                {t('save')}
            </button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (!insightData) return null
    if (isEditing) return renderEditForm()

    const { summary, findings, recommendation } = insightData
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
        className,
        isEditing && 'ring-2 ring-indigo-500 border-transparent shadow-2xl'
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
          {isEditing ? (
            <>
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleSaveEdit()
                }}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded bg-transparent transition-colors"
                title={t('save')}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleCancelEdit()
                }}
                className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded bg-transparent transition-colors"
                title={t('cancel')}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </>
          ) : (
            isExpanded && (
              <>
                {!readOnly && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleStartEdit()
                    }}
                    className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded bg-transparent transition-colors"
                    title={t('edit') || 'Edit'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
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
            )
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