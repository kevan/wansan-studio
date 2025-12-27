import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { FilterParam } from '@shared/schemas/analysis'
import { useTranslation } from 'react-i18next'
import { FilterPanel } from './smart-filter/filter-panel'

interface SmartFilterModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (finalSql: string, params: Record<string, string[]>) => void
  params: FilterParam[]
  templateSql: string
  initialValues?: Record<string, string[]>
}

export function SmartFilterModal({
  isOpen,
  onCancel,
  onConfirm,
  params,
  templateSql,
  initialValues = {},
}: SmartFilterModalProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [activeIdx, setActiveIdx] = useState(0)
  const [paramValues, setParamValues] =
    useState<Record<string, string[]>>(initialValues)
  const confirmedRef = useRef(false)

  const activeParam = params[activeIdx]

  const handleConfirm = () => {
    let finalSql = templateSql
    params.forEach(p => {
      if (p.placeholder) {
        const vals = paramValues[p.placeholder] || []
        const sqlList = vals
          .map(v => `'${String(v).replace(/'/g, "''")}'`)
          .join(', ')

        // [FIX] Use regex to match the placeholder AND optional surrounding single quotes.
        // This prevents ''Value'' when template is already '{{PLACEHOLDER}}'.
        const escapedPlaceholder = p.placeholder.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        )
        const regex = new RegExp(
          `'${escapedPlaceholder}'|${escapedPlaceholder}`,
          'g'
        )
        finalSql = finalSql.replace(regex, sqlList)
      }
    })

    confirmedRef.current = true
    onConfirm(finalSql, paramValues)
  }

  const allFilled = params.every(
    p => (paramValues[p.placeholder]?.length || 0) > 0
  )
  const totalSelected = Object.values(paramValues).reduce(
    (acc, curr) => acc + curr.length,
    0
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => !open && !confirmedRef.current && onCancel()}
    >
      <DialogContent className="sm:max-w-200 p-0 gap-0 overflow-hidden border-zinc-200 shadow-2xl bg-white transition-all">
        {/* 1. Header (Span Full Width) */}
        <div className="px-5 py-4 border-b border-zinc-100 bg-gradient-to-b from-white to-zinc-50/30">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50/80 rounded-lg border border-indigo-100 shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="space-y-1 text-left">
              <DialogTitle className="text-base font-semibold text-zinc-900">
                {t('refine_analysis_title')}
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500 leading-normal">
                {t('refine_analysis_desc_prefix')}{' '}
                <span className="font-medium text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded text-xs border border-zinc-200">
                  {activeParam?.label || activeParam?.column}
                </span>
                {t('refine_analysis_desc_suffix')}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* 2. Split View Body */}
        <div className="flex h-100">
          {/* Left Sidebar */}
          <div className="w-[160px] flex-shrink-0 border-r border-zinc-100 bg-zinc-50/40 flex flex-col py-2 overflow-y-auto">
            {params.map((p, i) => {
              const isActive = activeIdx === i
              const hasValue = (paramValues[p.placeholder]?.length || 0) > 0
              return (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    'text-left px-4 py-3 text-sm flex items-center justify-between transition-colors relative outline-none',
                    isActive
                      ? 'bg-white text-indigo-900 font-medium shadow-[inset_3px_0_0_0_#4f46e5]'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                  )}
                >
                  <span className="truncate pr-2" title={p.label || p.column}>
                    {p.label || p.column}
                  </span>
                  {hasValue && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0 bg-white relative flex flex-col">
            {activeParam && (
              <FilterPanel
                key={activeParam.placeholder}
                param={activeParam}
                value={paramValues[activeParam.placeholder] || []}
                onChange={v =>
                  setParamValues(prev => ({
                    ...prev,
                    [activeParam.placeholder]: v,
                  }))
                }
              />
            )}
          </div>
        </div>

        {/* 3. Footer (Span Full Width) */}
        <div className="p-3 px-4 border-t border-zinc-100 bg-white flex justify-between items-center z-10">
          <div className="text-xs text-zinc-500 font-medium">
            {totalSelected > 0 ? (
              <span className="text-indigo-600">
                {t('selected_count', { count: totalSelected })}
              </span>
            ) : (
              <span>{t('please_select')}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!allFilled}
              size="sm"
              className={cn(
                'h-8 px-4 transition-all shadow-sm font-medium',
                allFilled
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                  : 'bg-zinc-200 text-zinc-400'
              )}
            >
              {t('run_analysis')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
