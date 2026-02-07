import React from 'react'
import {
  Sparkles,
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
  const hasSuggestions = suggestedPrompts && suggestedPrompts.length > 0

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Dynamic Content Section */}
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {!hasSuggestions ? (
          /* Feature Card: Run Analysis or Import */
          <div className="flex flex-col items-center w-full">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">
                {t('chat:empty_title')}
              </h2>
              <p className="text-zinc-500 text-sm font-medium opacity-80 leading-relaxed">
                {hasData ? t('chat:empty_subtitle_need_analysis') : t('chat:empty_subtitle')}
              </p>
            </div>

            {hasData ? (
              <button
                onClick={() => checkAutoLink()}
                disabled={isChatLoading || isRestoring || isAnalyzing}
                className={cn(
                  'group w-full p-10 rounded-[3rem] bg-white border border-zinc-100 shadow-2xl shadow-indigo-100/30 flex flex-col items-center gap-6 transition-all active:scale-[0.98]',
                  isAnalyzing ? 'opacity-80' : 'hover:border-indigo-200 hover:shadow-indigo-200/50'
                )}
              >
                <div className={cn(
                  "w-16 h-16 rounded-[2rem] bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200 transition-transform duration-500",
                  isAnalyzing ? "animate-spin" : "group-hover:rotate-12"
                )}>
                  {isAnalyzing ? <RefreshCw className="w-7 h-7 text-white" /> : <Sparkles className="w-7 h-7 text-white fill-current" />}
                </div>
                <div className="text-center space-y-1">
                  <div className="text-base font-black text-zinc-900 uppercase tracking-widest">
                    {isAnalyzing ? t('chat:auto_link_analyzing_title') : t('chat:run_analysis')}
                  </div>
                  <p className="text-xs text-zinc-400 font-bold italic opacity-80">
                    {t('chat:analysis_cta_desc')}
                  </p>
                </div>
              </button>
            ) : (
              <div className="w-full p-10 rounded-[3rem] border border-dashed border-zinc-200 flex flex-col items-center gap-3 opacity-60">
                 <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic">
                   {t('chat:no_data_yet')}
                 </div>
              </div>
            )}
          </div>
        ) : (
          /* AI Suggestions List */
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 mb-4 shadow-sm border border-indigo-100">
                <Sparkles className="w-6 h-6 text-indigo-500" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-1">
                {t('chat:empty_title')}
              </h2>
              <p className="text-zinc-500 text-xs font-medium opacity-70">
                {t('chat:empty_subtitle_with_ai')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 w-full">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isChatLoading && !isRestoring && !isAnalyzing) {
                      onSelectPrompt(prompt)
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
                  <span className="truncate flex-1">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
