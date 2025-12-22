import React from 'react'
import { FilterParam } from '@shared/schemas/analysis'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'

interface AnalysisTemplateCardProps {
  result: {
    summary?: string
    missing_params?: FilterParam[]
    title?: string
  }
  onOpenModal: () => void
  isExecuted: boolean
}

export function AnalysisTemplateCard({
  result,
  onOpenModal,
  isExecuted,
}: AnalysisTemplateCardProps) {
  const { t } = useTranslation('chat')

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-xl border transition-all duration-300 overflow-hidden",
        isExecuted
          ? "bg-zinc-50/50 border-zinc-100 mb-2 opacity-80 hover:opacity-100" // Subtle when done
          : "bg-white border-indigo-100 shadow-sm ring-4 ring-indigo-50/50" // Prominent when pending
      )}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "p-2 rounded-lg shrink-0 border transition-colors",
              isExecuted
                ? "bg-zinc-100 text-zinc-500 border-zinc-200"
                : "bg-indigo-50 text-indigo-600 border-indigo-100"
            )}
          >
            {isExecuted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <SlidersHorizontal className="w-4 h-4" />
            )}
          </div>

          <div className="space-y-1 text-left">
            <h4
              className={cn(
                "text-sm font-semibold",
                isExecuted ? "text-zinc-700" : "text-indigo-900"
              )}
            >
              {isExecuted
                ? t('chat:template_configured_title')
                : t('chat:template_required_title')}
            </h4>
            <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">
              {result.summary || t('chat:template_desc')}
            </p>
          </div>
        </div>

        {/* Action Area */}
        <div className="pl-[44px]">
          <Button
            size="sm"
            variant={isExecuted ? "outline" : "default"}
            onClick={onOpenModal}
            className={cn(
              "w-full sm:w-auto h-8 text-[11px] font-medium",
              isExecuted
                ? "border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50 hover:text-zinc-900"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border-none"
            )}
          >
            {isExecuted ? (
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3" />
                {t('chat:modify_parameters')}
              </span>
            ) : (
              t('chat:configure_and_run')
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}