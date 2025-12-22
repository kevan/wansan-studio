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
  onConfirm: (finalSql: string) => void
  params: FilterParam[]
  templateSql: string
}

export function SmartFilterModal({
  isOpen,
  onCancel,
  onConfirm,
  params,
  templateSql,
}: SmartFilterModalProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [activeIdx, setActiveIdx] = useState(0)
  const [paramValues, setParamValues] = useState<Record<string, string[]>>({})
  const confirmedRef = useRef(false)

  const activeParam = params[activeIdx]

  const handleConfirm = () => {
    let finalSql = templateSql
    params.forEach((p) => {
      if (p.placeholder) {
        const vals = paramValues[p.placeholder] || []
        const sqlList = vals
          .map((v) => `'${String(v).replace(/'/g, "''")}'`)
          .join(', ')
        finalSql = finalSql.replace(p.placeholder, sqlList)
      }
    })

    confirmedRef.current = true
    onConfirm(finalSql)
  }

  const allFilled = params.every(
    (p) => (paramValues[p.placeholder]?.length || 0) > 0
  )
  const totalSelected = Object.values(paramValues).reduce(
    (acc, curr) => acc + curr.length,
    0
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) =>
        !open && !confirmedRef.current && onCancel()
      }
    >
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden border-zinc-200 shadow-2xl bg-white block duration-200">
        {/* 1. Header */}
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

        {/* 2. Content Grid */}
        <div className="flex border-b border-zinc-100 h-[350px]">
          {/* Sidebar */}
          <div className="w-[160px] border-r border-zinc-100 bg-zinc-50/30 py-2 overflow-y-auto">
            {params.map((p, i) => (
              <button
                key={p.placeholder}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  'w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors outline-none focus-visible:bg-zinc-100',
                  activeIdx === i
                    ? 'bg-white shadow-sm font-medium text-zinc-900 border-l-2 border-indigo-600'
                    : 'text-zinc-500 hover:bg-zinc-50 border-l-2 border-transparent'
                )}
              >
                <span className="truncate pr-2" title={p.label || p.column}>
                  {p.label || p.column}
                </span>
                {(paramValues[p.placeholder]?.length || 0) > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 bg-white">
            {activeParam && (
              <FilterPanel
                key={activeParam.placeholder}
                param={activeParam}
                value={paramValues[activeParam.placeholder] || []}
                onChange={(v) =>
                  setParamValues((prev) => ({
                    ...prev,
                    [activeParam.placeholder]: v,
                  }))
                }
              />
            )}
          </div>
        </div>

        {/* 3. Footer */}
        <div className="p-3 px-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
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