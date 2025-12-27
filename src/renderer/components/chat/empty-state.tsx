import React from 'react'
import {
  Sparkles,
  BarChart3,
  PieChart,
  TrendingUp,
  Lightbulb,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useProjectStore } from '../../stores/useProjectStore'
import { useTranslation } from 'react-i18next'

interface EmptyStateProps {
  onSelectPrompt: (text: string) => void
  isChatLoading: boolean
  isRestoring: boolean
}

const STYLES = [
  { icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: PieChart, color: 'text-purple-500', bg: 'bg-purple-50' },
  { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
  { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-50' },
]

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
  const { t } = useTranslation('chat')

  const promptsToShow =
    suggestedPrompts && suggestedPrompts.length > 0
      ? suggestedPrompts.map((prompt, idx) => {
          const style = STYLES[idx % STYLES.length]
          return {
            ...style,
            title: 'ai_suggestion_title',
            prompt,
            isAi: true,
          }
        })
      : STARTER_PROMPTS

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Icon & Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 mb-6 shadow-sm ring-1 ring-orange-100/50">
          <Sparkles className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-semibold text-zinc-900 mb-2">
          {t('empty_title')}
        </h2>
        <p className="text-znic-500 max-w-md mx-auto">{t('empty_subtitle')}</p>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {promptsToShow.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (!isChatLoading && !isRestoring) {
                const text = item.isAi ? item.prompt : t(item.prompt)
                onSelectPrompt(text)
              }
            }}
            disabled={isChatLoading || isRestoring}
            className={cn(
              'group flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 text-left',
              isChatLoading || isRestoring
                ? 'border-zinc-100 bg-white cursor-not-allowed'
                : 'border-zinc-200 bg-white hover:border-orange-200 hover:shadow-md'
            )}
          >
            <div
              className={cn(
                'p-2 rounded-lg shrink-0 transition-colors',
                item.bg,
                'group-hover:bg-white'
              )}
            >
              <item.icon className={cn('w-5 h-5', item.color)} />
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 mb-1 group-hover:text-orange-600 transition-colors">
                {t(item.title)}
              </h3>
              <p className="text-sm text-zinc-500 line-clamp-2">
                {item.isAi ? item.prompt : t(item.prompt)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
