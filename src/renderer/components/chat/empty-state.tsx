import React from 'react'
import {
  Sparkles,
  BarChart3,
  PieChart,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useProjectStore } from '../../stores/useProjectStore'
import { useTranslation } from 'react-i18next'
import { useAutoLink } from '../../hooks/useAutoLink'

interface EmptyStateProps {
  onSelectPrompt: (text: string) => void
  isChatLoading: boolean
  isRestoring: boolean
}

const STARTER_PROMPTS = [
  {
    icon: BarChart3,
    title: 'starter_sales_title',
    prompt: 'starter_sales_prompt',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    isAi: false,
  },
  {
    icon: PieChart,
    title: 'starter_customer_title',
    prompt: 'starter_customer_prompt',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    isAi: false,
  },
  {
    icon: TrendingUp,
    title: 'starter_metric_title',
    prompt: 'starter_metric_prompt',
    color: 'text-green-500',
    bg: 'bg-green-50',
    isAi: false,
  },
  {
    icon: Sparkles,
    title: 'starter_anomaly_title',
    prompt: 'starter_anomaly_prompt',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    isAi: false,
  },
]

export function EmptyState({
  onSelectPrompt,
  isChatLoading,
  isRestoring,
}: EmptyStateProps) {
  const suggestedPrompts = useProjectStore(state => state.suggestedPrompts)
  const files = useProjectStore(state => state.files)
  const { t } = useTranslation(['chat', 'common'])
  const { checkAutoLink, isAnalyzing } = useAutoLink()

  const hasData = files.length > 0

  const promptsToShow =
    suggestedPrompts && suggestedPrompts.length > 0
      ? suggestedPrompts.map((prompt, _idx) => {
          return {
            title: 'ai_suggestion_title',
            prompt,
            isAi: true,
          }
        })
      : STARTER_PROMPTS

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Minimal Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 mb-6 shadow-sm border border-indigo-100">
          <Sparkles className="w-6 h-6 text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">
          {t('chat:empty_title')}
        </h2>
        <p className="text-zinc-500 max-w-md mx-auto text-sm font-medium opacity-80 leading-relaxed">
          {t('chat:empty_subtitle')}
        </p>
      </div>

      {/* 2. Simplified Pill Prompts Grid - Single Column */}
      <div className="w-full max-w-md px-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2.5">
          {promptsToShow.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!isChatLoading && !isRestoring && !isAnalyzing) {
                  const text = item.isAi ? item.prompt : t(`chat:${item.prompt}`)
                  onSelectPrompt(text)
                }
              }}
              disabled={isChatLoading || isRestoring || isAnalyzing}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-zinc-200 text-zinc-600 text-[12px] font-medium shadow-sm transition-all text-left overflow-hidden',
                isChatLoading || isRestoring || isAnalyzing
                  ? 'opacity-50 cursor-not-allowed border-zinc-100'
                  : 'hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 hover:shadow-md active:scale-95'
              )}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 group-hover:bg-indigo-400 transition-colors shrink-0" />
              <span className="truncate flex-1">
                {item.isAi ? item.prompt : t(`chat:${item.prompt}`)}
              </span>
            </button>
          ))}
        </div>

        {/* AI Analysis Trigger - Always show if we have data */}
        {hasData && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => checkAutoLink()}
              disabled={isChatLoading || isRestoring || isAnalyzing}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                isAnalyzing
                  ? 'text-zinc-400 cursor-not-allowed'
                  : 'text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50/50 active:scale-95'
              )}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {t('chat:auto_link_analyzing_title')}...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  {t('chat:run_analysis')}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
