import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Link as LinkIcon,
  Calculator,
  MessageSquare,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import {
  ContextAnalysisResult,
  RelationSuggestion,
  MetricSuggestion,
} from '@shared/types'

interface AnalysisReviewModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (data: {
    selectedRelations: RelationSuggestion[]
    selectedMetrics: MetricSuggestion[]
    selectedPrompts: string[]
  }) => void
  onStartAnalysis: () => void
  isAnalyzing: boolean
  result: ContextAnalysisResult | null
}

export function AnalysisReviewModal({
  isOpen,
  onCancel,
  onConfirm,
  onStartAnalysis,
  isAnalyzing,
  result,
}: AnalysisReviewModalProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [activeTab, setActiveTab] = useState<'relations' | 'metrics' | 'prompts'>(
    'relations'
  )

  // Selections (Indices)
  const [selectedRelations, setSelectedRelations] = useState<Set<number>>(
    new Set()
  )
  const [selectedMetrics, setSelectedMetrics] = useState<Set<number>>(new Set())
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set())

  // Initialize selections when result changes or modal opens
  useEffect(() => {
    if (isOpen && result) {
      // Default: Select ALL high confidence relations (> 0.7)
      const relIndices = new Set<number>()
      result.relationships.forEach((r, i) => {
        if (r.confidence > 0.7) relIndices.add(i)
      })
      setSelectedRelations(relIndices)

      // Default: Select ALL metrics (that don't look like subqueries for safety)
      const metricIndices = new Set<number>()
      ;(result.metrics || []).forEach((m, i) => {
        const isSubquery = /SELECT|FROM|JOIN/i.test(m.sqlExpression)
        if (!isSubquery) metricIndices.add(i)
      })
      setSelectedMetrics(metricIndices)

      // Default: Select ALL prompts
      setSelectedPrompts(new Set(result.suggestedPrompts))

      // Auto-switch tab to first non-empty category
      if (result.relationships.length > 0) setActiveTab('relations')
      else if ((result.metrics || []).length > 0) setActiveTab('metrics')
      else setActiveTab('prompts')
    }
  }, [isOpen, result])

  // --- RENDER: IDLE STATE ---
  if (isOpen && !isAnalyzing && !result) {
    return (
      <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
        <DialogContent className="sm:max-w-md p-6 border-zinc-200 shadow-2xl bg-white">
          <div className="flex flex-col items-center text-center gap-6 py-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm animate-in zoom-in duration-300">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold text-zinc-900">
                {t('chat:modeling_confirm_title')}
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500 leading-relaxed">
                {t('chat:modeling_confirm_desc')}
              </DialogDescription>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <Button
                variant="ghost"
                onClick={onCancel}
                className="flex-1 text-zinc-500 hover:bg-zinc-100"
              >
                {t('chat:modeling_confirm_cancel')}
              </Button>
              <Button
                onClick={onStartAnalysis}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('chat:modeling_confirm_ok')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // --- RENDER: LOADING STATE ---
  if (isOpen && isAnalyzing) {
    return (
      <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
        <DialogContent
          className="sm:max-w-sm p-12 border-zinc-200 shadow-2xl bg-white flex flex-col items-center justify-center gap-6"
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-25 duration-1000"></div>
            <div className="relative bg-white p-4 rounded-full border border-indigo-50 shadow-sm">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-zinc-900">
              {t('chat:auto_link_analyzing_title')}
            </h3>
            <p className="text-xs text-zinc-500">
              {t('chat:auto_link_analyzing_desc')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // --- RENDER: REVIEW STATE ---
  if (!result) return null

  const handleConfirm = () => {
    onConfirm({
      selectedRelations: result.relationships.filter((_, i) =>
        selectedRelations.has(i)
      ),
      selectedMetrics: (result.metrics || []).filter((_, i) =>
        selectedMetrics.has(i)
      ),
      selectedPrompts: Array.from(selectedPrompts),
    })
  }

  const toggleRelation = (idx: number) => {
    const next = new Set(selectedRelations)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedRelations(next)
  }

  const toggleMetric = (idx: number) => {
    const next = new Set(selectedMetrics)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedMetrics(next)
  }

  const togglePrompt = (prompt: string) => {
    const next = new Set(selectedPrompts)
    if (next.has(prompt)) next.delete(prompt)
    else next.add(prompt)
    setSelectedPrompts(next)
  }

  const renderSidebarItem = (
    id: 'relations' | 'metrics' | 'prompts',
    icon: any,
    label: string,
    count: number
  ) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        'w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors outline-none border-l-2',
        activeTab === id
          ? 'bg-white border-indigo-500 text-indigo-900 font-medium'
          : 'border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'p-1 rounded',
            activeTab === id
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-transparent'
          )}
        >
          {icon}
        </div>
        <span>{label}</span>
      </div>
      {count > 0 && (
        <Badge
          variant="secondary"
          className="ml-2 text-xs h-5 px-1.5 min-w-[20px] justify-center bg-zinc-100 text-zinc-600"
        >
          {count}
        </Badge>
      )}
    </button>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'relations':
        if (result.relationships.length === 0)
          return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <LinkIcon className="w-8 h-8 mb-2 opacity-50" />
              <p>{t('chat:no_suggestions')}</p>
            </div>
          )
        return (
          <div className="p-4 space-y-3">
            {result.relationships.map((rel, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-zinc-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                onClick={() => toggleRelation(i)}
              >
                <Checkbox
                  checked={selectedRelations.has(i)}
                  onChange={() => toggleRelation(i)}
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 flex-wrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="text-zinc-500 font-normal truncate max-w-[150px]"
                        title={rel.sourceTable}
                      >
                        {rel.sourceTable}
                      </span>
                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 shrink-0 text-xs font-mono">
                        {rel.sourceColumn}
                      </span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />

                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="text-zinc-500 font-normal truncate max-w-[150px]"
                        title={rel.targetTable}
                      >
                        {rel.targetTable}
                      </span>
                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 shrink-0 text-xs font-mono">
                        {rel.targetColumn}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs text-zinc-500 leading-relaxed flex-1">
                      {rel.reason}
                    </p>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap mt-0.5',
                        rel.confidence > 0.8
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      )}
                    >
                      {t('chat:confidence_score', {
                        score: Math.round(rel.confidence * 100),
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'metrics':
        const metrics = result.metrics || []
        if (metrics.length === 0)
            return (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <Calculator className="w-8 h-8 mb-2 opacity-50" />
                <p>{t('chat:no_suggestions')}</p>
              </div>
            )
        return (
          <div className="p-4 space-y-3">
            {metrics.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-zinc-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                onClick={() => toggleMetric(i)}
              >
                <Checkbox
                  checked={selectedMetrics.has(i)}
                  onChange={() => toggleMetric(i)}
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-sm font-semibold text-zinc-900 truncate">
                      {m.name}
                    </h4>
                    <span
                      className="text-[10px] text-zinc-400 font-mono bg-zinc-50 px-1 rounded truncate max-w-[120px]"
                      title={m.tableName}
                    >
                      {m.tableName}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs text-zinc-500 leading-relaxed flex-1">{m.description}</p>
                    {m.confidence !== undefined && (
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap mt-0.5',
                          m.confidence > 0.8
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                        )}
                      >
                        {t('chat:confidence_score', {
                          score: Math.round(m.confidence * 100),
                        })}
                      </span>
                    )}
                  </div>
                  {m.reason && (
                    <p className="text-[11px] text-zinc-400 mt-2 italic leading-relaxed border-l-2 border-zinc-100 pl-3 py-0.5">
                      {m.reason}
                    </p>
                  )}
                  <div className="bg-zinc-50 border border-zinc-200 rounded px-2.5 py-2 mt-2">
                    <code className="text-[10px] text-zinc-600 font-mono break-all block">
                      {m.sqlExpression}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'prompts':
        if (result.suggestedPrompts.length === 0)
            return (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p>{t('chat:no_suggestions')}</p>
              </div>
            )
        return (
          <div className="p-4 space-y-2">
            {result.suggestedPrompts.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                onClick={() => togglePrompt(p)}
              >
                <Checkbox
                  checked={selectedPrompts.has(p)}
                  onChange={() => togglePrompt(p)}
                />
                <span className="text-sm text-zinc-700">{p}</span>
              </div>
            ))}
          </div>
        )
    }
  }

  const totalSelected =
    selectedRelations.size + selectedMetrics.size + selectedPrompts.size

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden border-zinc-200 shadow-2xl bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 bg-gradient-to-b from-white to-zinc-50/50">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-semibold text-zinc-900">
                {t('chat:review_analysis_title')}
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500">
                {t('chat:review_analysis_desc')}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[60vh]">
          {/* Sidebar */}
          <div className="w-[180px] flex-shrink-0 border-r border-zinc-100 bg-zinc-50/50 flex flex-col py-2">
            {renderSidebarItem(
              'relations',
              <LinkIcon className="w-4 h-4" />,
              t('chat:tab_relations'),
              result.relationships.length
            )}
            {renderSidebarItem(
              'metrics',
              <Calculator className="w-4 h-4" />,
              t('chat:tab_metrics'),
              (result.metrics || []).length
            )}
            {renderSidebarItem(
              'prompts',
              <MessageSquare className="w-4 h-4" />,
              t('chat:tab_prompts'),
              result.suggestedPrompts.length
            )}
          </div>

          {/* Content */}
          <div className="flex-1 bg-white overflow-y-auto custom-scrollbar">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 bg-white flex justify-between items-center z-10">
          <div className="text-xs text-zinc-500 font-medium px-2">
            {totalSelected > 0 && (
              <span className="text-indigo-600">
                {t('chat:selected_count', { count: totalSelected })}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-zinc-600 hover:bg-zinc-100"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              disabled={totalSelected === 0}
            >
              {t('chat:confirm_apply')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}