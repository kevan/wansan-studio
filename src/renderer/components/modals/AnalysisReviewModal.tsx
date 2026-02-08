import { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Link as LinkIcon,
  MessageSquare,
  ArrowRight,
  Loader2,
  Tag,
  Zap,
  Calculator,
  Table2,
  GitMerge,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import {
  ContextAnalysisResult,
  RelationSuggestion,
  FileNode,
} from '@shared/types'
import { useProjectStore } from '@/stores/useProjectStore'

interface AnalysisReviewModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (data: {
    selectedRelations: RelationSuggestion[]
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
  const { t, i18n } = useTranslation(['chat', 'common', 'analysis'])
  const { files, updateColumnSemantic, addSmartMetric } = useProjectStore()

  // --- GLOBAL STATE ---
  const [onboardingStep, setOnboardingStep] = useState<
    'intro' | 'pending-semantic' | 'analyzing-semantic' | 'review-semantic' | 'ready-for-context' | 'context' | 'complete'
  >('intro')

  // --- SEMANTIC LOOP STATE ---
  const [semanticQueue, setSemanticQueue] = useState<FileNode[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSemanticResult, setCurrentSemanticResult] = useState<{
    columns: Record<string, any>
    metrics?: any[]
  } | null>(null)
  
  // Semantic Review Selection State
  const [activeSemanticTab, setActiveSemanticTab] = useState<'columns' | 'metrics'>('columns')
  const [selectedSemColumns, setSelectedSemColumns] = useState<Set<string>>(new Set())
  const [selectedSemMetrics, setSelectedSemMetrics] = useState<Set<number>>(new Set())

  // --- CONTEXT REVIEW STATE ---
  const [activeContextTab, setActiveContextTab] = useState<'relations' | 'prompts'>('relations')
  const [selectedRelations, setSelectedRelations] = useState<Set<number>>(new Set())
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set())

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!isOpen) {
      setOnboardingStep('intro')
      setSemanticQueue([])
      setCurrentIndex(0)
      setCurrentSemanticResult(null)
    }
  }, [isOpen])

  // Detect Context Analysis Result Arrival
  useEffect(() => {
    if (isOpen && result && onboardingStep !== 'complete') {
      const relIndices = new Set<number>()
      result.relationships.forEach((r, i) => {
        if (r.confidence > 0.8) relIndices.add(i)
      })
      setSelectedRelations(relIndices)
      setSelectedPrompts(new Set(result.suggestedPrompts))

      if (result.relationships.length > 0) setActiveContextTab('relations')
      else setActiveContextTab('prompts')

      setOnboardingStep('complete')
    }
  }, [isOpen, result, onboardingStep])

  // --- SEMANTIC LOGIC ---
  const unAnalyzedFiles = useMemo(() => {
    return files.filter(f => 
        f.status === 'ready' && 
        f.columns.every(c => !c.semantic?.description) &&
        (!f.smartMetrics || f.smartMetrics.length === 0)
    )
  }, [files])

  const startSemanticFlow = () => {
    if (unAnalyzedFiles.length === 0) {
      setOnboardingStep('ready-for-context')
      return
    }

    setSemanticQueue(unAnalyzedFiles)
    setCurrentIndex(0)
    setOnboardingStep('pending-semantic')
  }

  const handleStartAnalysis = async () => {
    const file = semanticQueue[currentIndex]
    if (!file) return

    setOnboardingStep('analyzing-semantic')
    setCurrentSemanticResult(null)

    const language = i18n.language?.startsWith('zh') ? 'zh' : 'en'
    try {
      const aiRes = await window.electronAPI.analyzeSemantics({
        tableName: file.tableName,
        columns: file.columns,
        language
      })

      if (aiRes.success && aiRes.data) {
        const res = aiRes.data
        setCurrentSemanticResult(res)
        
        const colKeys = new Set<string>()
        Object.entries(res.columns).forEach(([key, data]: [string, any]) => {
          if (!data.confidence || data.confidence > 0.8) colKeys.add(key)
        })
        setSelectedSemColumns(colKeys)

        const metricIndices = new Set<number>()
        ;(res.metrics || []).forEach((m: any, i: number) => {
          if (m.confidence === undefined || m.confidence > 0.8) metricIndices.add(i)
        })
        setSelectedSemMetrics(metricIndices)
        
        if (Object.keys(res.columns).length > 0) setActiveSemanticTab('columns')
        else setActiveSemanticTab('metrics')

        setOnboardingStep('review-semantic')
      } else {
        handleSemanticNext()
      }
    } catch (e) {
      console.error(`Failed to analyze ${file.name}`, e)
      handleSemanticNext()
    }
  }

  const handleSemanticConfirm = async () => {
    const file = semanticQueue[currentIndex]
    if (!file || !currentSemanticResult) return

    for (const colName of Array.from(selectedSemColumns)) {
      const semantic = currentSemanticResult.columns[colName]
      if (semantic) {
        updateColumnSemantic(file.id, colName, semantic)
      }
    }

    if (currentSemanticResult.metrics) {
      for (const idx of Array.from(selectedSemMetrics)) {
        const m = currentSemanticResult.metrics[idx] as any
        await addSmartMetric(file.id, {
          id: crypto.randomUUID(),
          name: m.name,
          sqlExpression: m.sqlExpression,
          description: m.description
        })
      }
    }

    handleSemanticNext()
  }

  const handleSemanticSkip = () => {
    handleSemanticNext()
  }

  const handleSemanticNext = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex < semanticQueue.length) {
      setCurrentIndex(nextIndex)
      setOnboardingStep('pending-semantic')
    } else {
      setOnboardingStep('ready-for-context')
    }
  }

  const handleStartContext = () => {
    setOnboardingStep('context')
    onStartAnalysis()
  }

  const handleSkipContext = () => {
    onCancel()
  }

  const handleContextConfirm = () => {
    if (!result) return
    onConfirm({
      selectedRelations: result.relationships.filter((_, i) => selectedRelations.has(i)),
      selectedPrompts: Array.from(selectedPrompts),
    })
  }

  // --- UI COMPONENTS ---

  const StepIndicator = useMemo(() => {
    const totalSteps = semanticQueue.length + (onboardingStep === 'intro' ? 0 : 1)
    const currentPos = onboardingStep === 'complete' ? totalSteps : currentIndex + 1
    const percentage = (currentPos / (totalSteps || 1)) * 100

    return (
      <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-100 overflow-hidden">
        <div 
          className="h-full bg-indigo-600 transition-all duration-500 ease-in-out" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }, [onboardingStep, currentIndex, semanticQueue.length])

  const renderIntro = () => {
    const hasPending = unAnalyzedFiles.length > 0
    
    return (
      <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-200 animate-pulse">
              <Sparkles className="w-10 h-10 fill-current" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-lg border-4 border-white">
              <Zap className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="space-y-3">
            <DialogTitle className="text-3xl font-black text-zinc-900 tracking-tight">
              {t('chat:modeling_onboarding_title')}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium text-base max-w-md mx-auto leading-relaxed">
              {hasPending 
                ? t('chat:modeling_onboarding_desc') 
                : "当前所有数据表已完成基础激活。您可以直接开始扫描多表关联与洞察建议。"}
            </DialogDescription>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-zinc-50/80 rounded-[2rem] p-6 border border-zinc-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                hasPending ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
              )}>
                {hasPending ? <Tag className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">资产扫描状态</span>
                <span className="text-sm font-bold text-zinc-900">
                  {hasPending 
                    ? `检测到 ${unAnalyzedFiles.length} 张待激活的新数据表` 
                    : "所有数据表已具备业务语义"}
                </span>
              </div>
           </div>
           {!hasPending && (
             <div className="text-[10px] font-bold text-zinc-400 max-w-[120px] text-right leading-tight">
                如需重新分析，请前往“数据管理”工作区。
             </div>
           )}
        </div>

        <div className="grid grid-cols-2 gap-6 opacity-60 grayscale-[0.5]">
          <div className="flex flex-col gap-4 p-6 rounded-[2rem] border border-zinc-100 bg-zinc-50/50 group border-b-4 border-b-indigo-100">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <Tag className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-zinc-900 text-sm">{t('chat:step_semantics_title')}</h4>
              <p className="text-[11px] text-zinc-400 leading-normal font-medium">{t('chat:step_semantics_desc')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-6 rounded-[2rem] border border-zinc-100 bg-zinc-50/50 group border-b-4 border-b-amber-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
              <GitMerge className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-zinc-900 text-sm">{t('chat:step_context_title')}</h4>
              <p className="text-[11px] text-zinc-400 leading-normal font-medium">{t('chat:step_context_desc')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {hasPending ? (
            <>
              <Button onClick={startSemanticFlow} className="w-full h-16 bg-zinc-900 hover:bg-black text-white font-black text-lg rounded-2xl shadow-xl transition-all active:scale-95 group">
                <span>开始激活数据表 ({unAnalyzedFiles.length})</span>
                <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="ghost" onClick={handleStartContext} className="w-full h-12 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 font-bold rounded-xl transition-colors">
                跳过语义，直接探索洞察
              </Button>
            </>
          ) : (
            <Button onClick={handleStartContext} className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl transition-all active:scale-95 group">
              <span>立即开始关联与洞察分析</span>
              <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderPendingSemantic = () => {
    const file = semanticQueue[currentIndex]
    if (!file) return null

    return (
      <div className="p-12 space-y-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner border border-indigo-100/50">
            <FileSpreadsheet className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center text-indigo-600 border border-zinc-100 font-black text-sm">
            {currentIndex + 1}
          </div>
        </div>
        <div className="space-y-3">
          <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-100 px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] text-[10px]">
            {t('chat:analyzing_file_count', { current: currentIndex + 1, total: semanticQueue.length })}
          </Badge>
          <h3 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight">
            激活 &ldquo;{file.name}&rdquo;
          </h3>
          <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">
            {t('chat:step_semantics_desc_pre', { name: file.name, defaultValue: '准备好揭开数据背后的业务逻辑了吗？AI 将尝试自动识别字段属性。' })}
          </p>
        </div>
        <div className="flex gap-4 w-full max-w-sm">
          <Button variant="outline" onClick={handleSemanticSkip} className="flex-1 h-14 rounded-2xl font-bold border-zinc-200 hover:bg-zinc-50 transition-all text-zinc-500">
            {t('common:skip')}
          </Button>
          <Button onClick={handleStartAnalysis} className="flex-[1.5] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-2xl shadow-indigo-200 transition-all active:scale-95 group">
            {t('analysis:sql_editor.run', '立即分析')} <Sparkles className="w-5 h-5 ml-2 fill-current group-hover:rotate-12 transition-transform" />
          </Button>
        </div>
      </div>
    )
  }

  const renderAnalyzingSemantic = () => {
    const file = semanticQueue[currentIndex]
    return (
      <div className="flex flex-col items-center text-center gap-10 py-20 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-24 h-24 rounded-[3rem] bg-zinc-50 flex items-center justify-center shadow-inner border border-zinc-100">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-32 h-32 rounded-full border-4 border-dashed border-indigo-100 animate-[spin_10s_linear_infinite]" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
             <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
             <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
             <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 tracking-tight uppercase tracking-[0.1em]">
            {t('analysis:analyzing_semantics_title', 'AI 分析中...')}
          </h3>
          <p className="text-sm text-zinc-400 font-medium italic">
            {file ? t('chat:analyzing_file', { name: file.name }) : '...'}
          </p>
        </div>
      </div>
    )
  }

  const renderSemanticReview = () => {
    const file = semanticQueue[currentIndex]
    if (!currentSemanticResult || !file) return null
    const result = currentSemanticResult

    return (
      <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-4 duration-500">
        {/* Header */}
        <div className="px-10 py-8 border-b border-zinc-50 bg-white/80 backdrop-blur-sm shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black text-zinc-900 tracking-tight">
                {file.name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none rounded-md text-[10px] font-black uppercase">
                  AI 建议已生成
                </Badge>
                <span className="text-[10px] text-zinc-300 font-bold">•</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  {currentIndex + 1} OF {semanticQueue.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 bg-zinc-50/30">
          {/* Sidebar */}
          <div className="w-[200px] flex-shrink-0 border-r border-zinc-100 flex flex-col py-6 gap-1">
            <button
              onClick={() => setActiveSemanticTab('columns')}
              className={cn(
                'mx-3 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all outline-none',
                activeSemanticTab === 'columns' ? 'bg-white shadow-xl shadow-zinc-200/50 text-indigo-600 scale-105' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50'
              )}
            >
              <div className="flex items-center gap-2"><Tag className="w-4 h-4" />{t('common:columns')}</div>
              <Badge variant="secondary" className={cn("ml-2 border-none px-1.5 h-5", activeSemanticTab === 'columns' ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-500")}>
                {Object.keys(result.columns).length}
              </Badge>
            </button>
            <button
              onClick={() => setActiveSemanticTab('metrics')}
              className={cn(
                'mx-3 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all outline-none',
                activeSemanticTab === 'metrics' ? 'bg-white shadow-xl shadow-zinc-200/50 text-indigo-600 scale-105' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50'
              )}
            >
              <div className="flex items-center gap-2"><Calculator className="w-4 h-4" />指标</div>
              <Badge variant="secondary" className={cn("ml-2 border-none px-1.5 h-5", activeSemanticTab === 'metrics' ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-500")}>
                {(result.metrics || []).length}
              </Badge>
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            {activeSemanticTab === 'columns' ? (
              <div className="grid gap-4">
                {Object.entries(result.columns).map(([colName, data]: [string, any]) => (
                  <div 
                    key={colName} 
                    className={cn(
                      "group flex items-start gap-5 p-5 rounded-[1.5rem] border transition-all cursor-pointer", 
                      selectedSemColumns.has(colName) ? "border-indigo-200 bg-white shadow-xl shadow-indigo-100/20" : "border-zinc-100 hover:border-zinc-200 bg-white/50"
                    )} 
                    onClick={() => {
                      const next = new Set(selectedSemColumns)
                      if (next.has(colName)) next.delete(colName)
                      else next.add(colName)
                      setSelectedSemColumns(next)
                    }}
                  >
                    <div className={cn("mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", selectedSemColumns.has(colName) ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200" : "border-zinc-200")}>
                       {selectedSemColumns.has(colName) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-zinc-900">{colName}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-300" />
                          <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                            {data.aliases && data.aliases.length > 0 ? data.aliases[0] : colName}
                          </span>
                        </div>
                        {data.confidence !== undefined && (
                          <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', data.confidence > 0.8 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>
                            {Math.round(data.confidence * 100)}% MATCH
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                         <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-zinc-900 text-white border-none">{data.businessType}</Badge>
                         <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-zinc-100 border-none text-zinc-500">{data.usageType}</Badge>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed italic border-l-2 border-indigo-100 pl-3">{data.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {(result.metrics || []).map((m: any, i: number) => (
                  <div 
                    key={i} 
                    className={cn(
                      "group flex items-start gap-5 p-5 rounded-[1.5rem] border transition-all cursor-pointer", 
                      selectedSemMetrics.has(i) ? "border-indigo-200 bg-white shadow-xl shadow-indigo-100/20" : "border-zinc-100 hover:border-zinc-200 bg-white/50"
                    )} 
                    onClick={() => {
                      const next = new Set(selectedSemMetrics)
                      if (next.has(i)) next.delete(i)
                      else next.add(i)
                      setSelectedSemMetrics(next)
                    }}
                  >
                    <div className={cn("mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", selectedSemMetrics.has(i) ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200" : "border-zinc-200")}>
                       {selectedSemMetrics.has(i) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-black text-zinc-900">{m.name}</h4>
                        {m.confidence !== undefined && <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', m.confidence > 0.8 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>{Math.round(m.confidence * 100)}%</span>}
                      </div>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed">{m.description}</p>
                      <div className="bg-zinc-900 rounded-2xl p-4 shadow-inner shadow-black/20">
                        <code className="text-[11px] text-indigo-300 font-mono break-all leading-normal">{m.sqlExpression}</code>
                      </div>
                    </div>
                  </div>
                ))}
                {(result.metrics || []).length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-zinc-300 py-20 opacity-50">
                      <Table2 className="w-16 h-16 mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">{t('analysis:no_metric_suggestions')}</p>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-6 border-t border-zinc-100 bg-white flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={handleSemanticSkip} className="rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50">
            {t('common:skip')}
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
              已选 {selectedSemColumns.size + selectedSemMetrics.size} 项建议
            </div>
            <Button onClick={handleSemanticConfirm} className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-2xl shadow-indigo-200 transition-all active:scale-95">
              {t('chat:confirm_apply')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderReadyForContext = () => (
    <div className="p-12 space-y-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="w-24 h-24 rounded-[3rem] bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-100 border border-emerald-100 animate-pulse">
          <GitMerge className="w-10 h-10" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-4 border-white animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>
      <div className="space-y-3">
        <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest">
          语义准备就绪
        </Badge>
        <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{t('chat:all_files_analyzed')}</h3>
        <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">{t('chat:step_context_desc')}</p>
      </div>
      <div className="flex gap-4 w-full max-w-sm">
        <Button variant="outline" onClick={handleSkipContext} className="flex-1 h-14 rounded-2xl font-black text-zinc-400 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 transition-all uppercase tracking-widest text-xs">
          {t('common:close')}
        </Button>
        <Button onClick={handleStartContext} className="flex-[1.5] h-14 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black shadow-2xl shadow-zinc-200 transition-all active:scale-95 group">
          {t('chat:start_context_analysis')} <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  )

  const renderAnalyzingContext = () => (
    <div className="flex flex-col items-center text-center gap-10 py-20 animate-in fade-in duration-500">
      <div className="relative">
        <div className="w-24 h-24 rounded-[3rem] bg-amber-50 flex items-center justify-center shadow-inner border border-amber-100">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-32 h-32 rounded-full border-4 border-dashed border-amber-200 animate-[spin_12s_linear_infinite]" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2">
           <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]" />
           <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
           <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
        </div>
        <h3 className="text-xl font-black text-zinc-900 tracking-tight uppercase tracking-[0.1em]">
          {t('chat:auto_link_analyzing_title')}
        </h3>
        <p className="text-sm text-zinc-400 font-medium italic">
          {t('chat:auto_link_analyzing_desc')}
        </p>
      </div>
    </div>
  )

  const renderContextReview = () => {
    if (!result) return null

    return (
      <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-4 duration-500">
        {/* Header */}
        <div className="px-10 py-8 border-b border-zinc-50 bg-white/80 backdrop-blur-sm shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-100 shrink-0">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black text-zinc-900 tracking-tight">
                {t('chat:review_analysis_title')}
              </DialogTitle>
              <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-none rounded-md text-[10px] font-black uppercase">
                多表关联与探索建议
              </Badge>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 bg-zinc-50/30">
          <div className="w-[200px] flex-shrink-0 border-r border-zinc-100 flex flex-col py-6 gap-1">
             <button onClick={() => setActiveContextTab('relations')} className={cn('mx-3 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all outline-none', activeContextTab === 'relations' ? 'bg-white shadow-xl shadow-zinc-200/50 text-indigo-600 scale-105' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50')}>
                <div className="flex items-center gap-2"><LinkIcon className="w-4 h-4" />关联</div>
                <Badge variant="secondary" className={cn("ml-2 border-none px-1.5 h-5", activeContextTab === 'relations' ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-500")}>
                  {result.relationships.length}
                </Badge>
             </button>
             <button onClick={() => setActiveContextTab('prompts')} className={cn('mx-3 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all outline-none', activeContextTab === 'prompts' ? 'bg-white shadow-xl shadow-zinc-200/50 text-indigo-600 scale-105' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50')}>
                <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />建议</div>
                <Badge variant="secondary" className={cn("ml-2 border-none px-1.5 h-5", activeContextTab === 'prompts' ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-500")}>
                  {result.suggestedPrompts.length}
                </Badge>
             </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            {activeContextTab === 'relations' ? (
               <div className="grid gap-4">
                 {result.relationships.map((rel, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "group flex items-start gap-5 p-5 rounded-[1.5rem] border transition-all cursor-pointer", 
                        selectedRelations.has(i) ? "border-indigo-200 bg-white shadow-xl shadow-indigo-100/20" : "border-zinc-100 hover:border-zinc-200 bg-white/50"
                      )} 
                      onClick={() => {
                        const next = new Set(selectedRelations)
                        if (next.has(i)) next.delete(i)
                        else next.add(i)
                        setSelectedRelations(next)
                      }}
                    >
                       <div className={cn("mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", selectedRelations.has(i) ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200" : "border-zinc-200")}>
                          {selectedRelations.has(i) && <CheckCircle2 className="w-3 h-3 text-white" />}
                       </div>
                       <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-black text-zinc-900 flex-wrap">
                            <span className="text-zinc-400">{rel.sourceTable}</span>
                            <span className="bg-zinc-100 px-2 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-tighter text-zinc-600">{rel.sourceColumn}</span>
                            <ArrowRight className="w-4 h-4 text-zinc-300" />
                            <span className="text-zinc-400">{rel.targetTable}</span>
                            <span className="bg-zinc-100 px-2 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-tighter text-zinc-600">{rel.targetColumn}</span>
                          </div>
                          <div className="flex items-start justify-between gap-6">
                            <p className="text-xs text-zinc-500 font-medium flex-1 italic leading-relaxed">&ldquo;{rel.reason}&rdquo;</p>
                            <span className={cn('text-[10px] font-black px-2 py-1 rounded-lg uppercase border shrink-0', rel.confidence > 0.8 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>
                              {Math.round(rel.confidence * 100)}% CONFIDENCE
                            </span>
                          </div>
                       </div>
                    </div>
                 ))}
               </div>
            ) : (
               <div className="grid gap-3">
                  {result.suggestedPrompts.map((p, i) => (
                     <div 
                      key={i} 
                      className={cn(
                        "group flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all cursor-pointer", 
                        selectedPrompts.has(p) ? "border-indigo-200 bg-white shadow-xl shadow-indigo-100/20" : "border-zinc-100 hover:border-zinc-200 bg-white/50"
                      )} 
                      onClick={() => {
                        const next = new Set(selectedPrompts)
                        if (next.has(p)) next.delete(p)
                        else next.add(p)
                        setSelectedPrompts(next)
                      }}
                    >
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", selectedPrompts.has(p) ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200" : "border-zinc-200")}>
                          {selectedPrompts.has(p) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-black text-zinc-700">{p}</span>
                     </div>
                  ))}
               </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-6 border-t border-zinc-100 bg-white flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={handleSkipContext} className="rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-900">
             {t('common:cancel')}
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
              已选 {selectedRelations.size + selectedPrompts.size} 项模型定义
            </div>
            <Button onClick={handleContextConfirm} className="h-14 px-10 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-2xl shadow-amber-200 transition-all active:scale-95" disabled={selectedRelations.size === 0 && selectedPrompts.size === 0}>
               {t('chat:confirm_apply')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
      <DialogContent 
        className="sm:max-w-4xl p-0 gap-0 overflow-hidden border-none shadow-2xl bg-white rounded-[2.5rem] h-[85vh] flex flex-col"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        {StepIndicator}
        
        {onboardingStep === 'intro' && renderIntro()}
        {onboardingStep === 'pending-semantic' && renderPendingSemantic()}
        {onboardingStep === 'analyzing-semantic' && renderAnalyzingSemantic()}
        {onboardingStep === 'review-semantic' && renderSemanticReview()}
        {onboardingStep === 'ready-for-context' && renderReadyForContext()}
        {(onboardingStep === 'context' || isAnalyzing) && onboardingStep !== 'complete' && renderAnalyzingContext()}
        {onboardingStep === 'complete' && renderContextReview()}
      </DialogContent>
    </Dialog>
  )
}