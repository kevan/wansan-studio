import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import { Skeleton } from '../ui/skeleton'
import {
  Sparkles,
  Calculator,
  Tag,
  ArrowRight,
  Loader2,
  Table2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'

interface SemanticReviewModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (data: {
    selectedColumns: Record<string, any>
    selectedMetrics: any[]
  }) => void
  isAnalyzing: boolean
  result: {
    columns: Record<string, any>
    metrics?: any[]
  } | null
}

export function SemanticReviewModal({
  isOpen,
  onCancel,
  onConfirm,
  isAnalyzing,
  result,
}: SemanticReviewModalProps) {
  const { t } = useTranslation(['common', 'analysis'])
  const [activeTab, setActiveTab] = useState<'columns' | 'metrics'>('columns')

  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [selectedMetrics, setSelectedMetrics] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isOpen && result) {
      // Default: Select ALL high confidence columns (> 0.8)
      const colKeys = new Set<string>()
      Object.entries(result.columns).forEach(([key, data]) => {
        if (!data.confidence || data.confidence > 0.8) colKeys.add(key)
      })
      setSelectedColumns(colKeys)

      // Default: Select ALL high confidence metrics (> 0.8)
      const metricIndices = new Set<number>()
      ;(result.metrics || []).forEach((m, i) => {
        if (m.confidence === undefined || m.confidence > 0.8) metricIndices.add(i)
      })
      setSelectedMetrics(metricIndices)
      
      if (Object.keys(result.columns).length > 0) setActiveTab('columns')
      else if ((result.metrics || []).length > 0) setActiveTab('metrics')
    }
  }, [isOpen, result])

  if (isOpen && isAnalyzing) {
    return (
      <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
        <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden border-none shadow-2xl bg-white rounded-[2rem]">
          {/* Header */}
          <div className="px-8 py-6 border-b border-zinc-100 bg-zinc-50/50">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-100 shrink-0">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  {t('analysis:analyzing_semantics_title', 'Analyzing Semantics...')}
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-500 font-medium">
                  {t('analysis:analyzing_semantics_desc', 'AI is exploring your data structure.')}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Body Skeleton */}
          <div className="flex h-[50vh]">
            <div className="w-[180px] flex-shrink-0 border-r border-zinc-100 bg-zinc-50/30 flex flex-col py-4 gap-2 px-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="flex-1 p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-2xl border border-zinc-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-1/3 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Skeleton */}
          <div className="p-6 border-t border-zinc-100 bg-white flex justify-between items-center">
            <Skeleton className="h-4 w-24 rounded" />
            <div className="flex gap-3">
               <Skeleton className="h-10 w-20 rounded-xl" />
               <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!result) return null

  const handleConfirm = () => {
    const filteredColumns: Record<string, any> = {}
    selectedColumns.forEach(colName => {
      filteredColumns[colName] = result.columns[colName]
    })

    onConfirm({
      selectedColumns: filteredColumns,
      selectedMetrics: (result.metrics || []).filter((_, i) => selectedMetrics.has(i)),
    })
  }

  const toggleColumn = (colName: string) => {
    const next = new Set(selectedColumns)
    if (next.has(colName)) next.delete(colName)
    else next.add(colName)
    setSelectedColumns(next)
  }

  const toggleMetric = (idx: number) => {
    const next = new Set(selectedMetrics)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedMetrics(next)
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden border-none shadow-2xl bg-white rounded-[2rem]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 shrink-0">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-zinc-900 tracking-tight">
                {t('analysis:review_semantics_title', 'Review Semantic Suggestions')}
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500 font-medium">
                {t('analysis:review_semantics_desc', 'Check and refine the AI-generated business metadata.')}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[50vh]">
          {/* Sidebar */}
          <div className="w-[180px] flex-shrink-0 border-r border-zinc-100 bg-zinc-50/30 flex flex-col py-4">
            <button
              onClick={() => setActiveTab('columns')}
              className={cn(
                'w-full text-left px-6 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-between transition-all outline-none border-l-4',
                activeTab === 'columns'
                  ? 'bg-white border-indigo-600 text-indigo-600'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600'
              )}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {t('common:columns')}
              </div>
              <Badge variant="secondary" className="ml-2 bg-zinc-100 text-zinc-500 border-none">{Object.keys(result.columns).length}</Badge>
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={cn(
                'w-full text-left px-6 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-between transition-all outline-none border-l-4',
                activeTab === 'metrics'
                  ? 'bg-white border-indigo-600 text-indigo-600'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600'
              )}
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                {t('analysis:smart_metrics')}
              </div>
              <Badge variant="secondary" className="ml-2 bg-zinc-100 text-zinc-500 border-none">{(result.metrics || []).length}</Badge>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white overflow-y-auto custom-scrollbar p-6">
            {activeTab === 'columns' ? (
              <div className="space-y-3">
                {Object.entries(result.columns).map(([colName, data]) => (
                  <div
                    key={colName}
                    className={cn(
                        "group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                        selectedColumns.has(colName) ? "border-indigo-100 bg-indigo-50/30" : "border-zinc-100 hover:border-zinc-200 bg-white"
                    )}
                    onClick={() => toggleColumn(colName)}
                  >
                    <Checkbox checked={selectedColumns.has(colName)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-900">{colName}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-300" />
                          <span className="text-sm font-bold text-indigo-600">
                            {data.aliases && data.aliases.length > 0 ? data.aliases.join(', ') : colName}
                          </span>
                        </div>
                        {data.confidence !== undefined && (
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap',
                              data.confidence > 0.8
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-amber-50 text-amber-600'
                            )}
                          >
                            {Math.round(data.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter bg-white">{data.businessType}</Badge>
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter bg-zinc-100 border-none text-zinc-500">{data.usageType}</Badge>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed italic line-clamp-1 mb-1">
                        {data.description}
                      </p>
                      {data.reason && (
                        <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2">
                          {data.reason}
                        </p>
                      )}
                      {data.extractionHints && data.extractionHints.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-purple-600 bg-purple-50 px-2 py-1 rounded-lg w-fit">
                           <Sparkles className="w-3 h-3 fill-current" />
                           <span className="text-[10px] font-bold uppercase tracking-tighter">{t('analysis:has_extraction_hint', 'Has Extraction Hint')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(result.metrics || []).map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                        "group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                        selectedMetrics.has(i) ? "border-indigo-100 bg-indigo-50/30" : "border-zinc-100 hover:border-zinc-200 bg-white"
                    )}
                    onClick={() => toggleMetric(i)}
                  >
                    <Checkbox checked={selectedMetrics.has(i)} />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-zinc-900">{m.name}</h4>
                        {m.confidence !== undefined && (
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap',
                              m.confidence > 0.8
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-amber-50 text-amber-600'
                            )}
                          >
                            {Math.round(m.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">{m.description}</p>
                      <div className="bg-zinc-900 rounded-xl p-3">
                        <code className="text-[10px] text-zinc-300 font-mono break-all">{m.sqlExpression}</code>
                      </div>
                      <p className="text-[10px] text-indigo-500 font-bold italic leading-relaxed">
                        {t('analysis:why', 'Why')}: {m.reason}
                      </p>
                    </div>
                  </div>
                ))}
                {(result.metrics || []).length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-zinc-300 py-12">
                      <Table2 className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium">{t('analysis:no_metric_suggestions', 'No single-table metric suggestions found.')}</p>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 bg-white flex justify-between items-center z-10">
          <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest px-2">
            {selectedColumns.size + selectedMetrics.size} {t('common:selected', 'Selected')}
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="rounded-xl font-bold text-zinc-500"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-indigo-100"
              disabled={selectedColumns.size === 0 && selectedMetrics.size === 0}
            >
              {t('common:save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
