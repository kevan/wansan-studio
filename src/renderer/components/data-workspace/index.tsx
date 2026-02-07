import React, { useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { DataPreviewPanel } from '../report/data-preview-panel'
import { ColumnsView } from './columns-view'
import { MetricsView } from './metrics-view'
import { RelationsView } from './relations-view'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useTranslation } from 'react-i18next'
import { 
  Table, 
  FileCode, 
  Database, 
  Hash, 
  Info, 
  Sparkles, 
  Plus, 
  GitMerge, 
  RefreshCw, 
  Trash2,
  FileSpreadsheet,
  Link2,
  Tag
} from 'lucide-react'
import { ExpandableAction } from '../ui/expandable-action'
import { ConfirmDialog } from '../modals/ConfirmDialog'
import { useToastStore } from '@/stores/useToastStore'
import { DataLineageDialog } from '../modals/DataLineageDialog'
import { useWizardStore } from '@/stores/useWizardStore'
import { useProGate } from '@/hooks/use-pro-gate'
import { FloatingActionLayout } from '../FloatingActionLayout'
import { SemanticReviewModal } from '../modals/SemanticReviewModal'

export function DataWorkspace() {
  const { t, i18n } = useTranslation('common')
  const { t: tAnalysis } = useTranslation('analysis')
  const toast = useToastStore()
  const openWizard = useWizardStore(s => s.open)
  const { checkGate, gateNode } = useProGate()

  const activeFileId = useProjectStore(s => s.activeFileId)
  const files = useProjectStore(s => s.files)
  const removeFile = useProjectStore(s => s.removeFile)
  const updateColumnSemantic = useProjectStore(s => s.updateColumnSemantic)
  const addSmartMetric = useProjectStore(s => s.addSmartMetric)
  const activeView = useProjectStore(s => s.activeView)

  const [activeTab, setActiveTab] = useState('columns')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAnalyzeConfirm, setShowAnalyzeConfirm] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [showLineage, setShowLineage] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Sync activeTab with activeView from store
  React.useEffect(() => {
    if (activeView === 'preview' || activeView === 'schema') {
        setActiveTab(activeView === 'schema' ? 'columns' : 'preview')
    }
  }, [activeView])

  const currentFile = files.find(f => f.id === activeFileId) || files[0]
  
  if (!currentFile) {
    return null 
  }

  const handleAppend = () => {
    checkGate(t('append_data', 'Append'), () => {
      openWizard('append', currentFile.id)
    })
  }
  const handleMerge = () => {
    checkGate(t('merge_data', 'Merge'), () => {
      openWizard('merge', currentFile.id)
    })
  }
  const handleReplace = () => {
    openWizard('replace', currentFile.id)
  }
  const handleDeleteFile = async () => {
    await removeFile(currentFile.id)
    setShowDeleteConfirm(false)
    toast.addToast({ title: t('file_deleted'), type: 'success' })
  }

  const handleAnalyzeSemantics = async () => {
    setIsAnalyzing(true)
    setShowAnalyzeConfirm(false)
    setShowReviewModal(true) // Show modal immediately with loading state
    setAnalysisResult(null)

    try {
      const language = i18n.language?.startsWith('zh') ? 'zh' : 'en'
      const aiRes = await window.electronAPI.analyzeSemantics({
        tableName: currentFile.tableName,
        columns: currentFile.columns,
        language
      })
      if (!aiRes.success || !aiRes.data)
        throw new Error(aiRes.error || 'AI analysis failed')

      setAnalysisResult(aiRes.data)
    } catch (e: any) {
      setShowReviewModal(false)
      toast.addToast({
        title: t('analysis_failed', 'Analysis Failed'),
        description: e.message,
        type: 'error',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleApplySemanticReview = async (data: { selectedColumns: Record<string, any>, selectedMetrics: any[] }) => {
    const { selectedColumns, selectedMetrics } = data
    
    // 1. Apply Column Semantics
    Object.entries(selectedColumns).forEach(([colName, semantic]) => {
      updateColumnSemantic(currentFile.id, colName, semantic as any)
    })

    // 2. Apply Suggested Metrics
    for (const m of selectedMetrics) {
      await addSmartMetric(currentFile.id, {
        id: crypto.randomUUID(),
        name: m.name,
        sqlExpression: m.sqlExpression,
        description: m.description
      })
    }

    setShowReviewModal(false)
    toast.addToast({
      title: t('semantics_analysis_complete', 'Semantics Analysis Complete'),
      type: 'success',
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fbfbfa] dark:bg-zinc-950 overflow-hidden relative">
      {/* 1. Global Workspace Header */}
      <header className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900 z-30">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 shrink-0 text-indigo-600 dark:text-indigo-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-base font-bold tracking-tight truncate leading-tight">
              {currentFile.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <button
                  onClick={() => setShowLineage(true)}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded border border-zinc-100 dark:border-zinc-700 whitespace-nowrap hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-help group"
                >
                  <Database className="w-2 h-2 opacity-70 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                  <code className="text-[9px] font-mono">
                    {currentFile.tableName}
                  </code>
                  <Info className="w-2 h-2 opacity-0 group-hover:opacity-100 ml-0.5" />
                </button>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-100 dark:border-emerald-800 whitespace-nowrap">
                  <Hash className="w-2 h-2" />
                  <span className="text-[9px] font-black uppercase tracking-tight">
                    {currentFile.rowCount?.toLocaleString() || 0} {t('rows')}
                  </span>
                </div>
            </div>
          </div>
        </div>

        {/* Workspace Toolbar */}
        <div className="flex items-center p-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700 rounded-xl shadow-sm shrink-0">
            <ExpandableAction
              icon={isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              label={t('ai_tag', 'AI Semantics')}
              onClick={() => setShowAnalyzeConfirm(true)}
              disabled={isAnalyzing}
              className="text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-zinc-700 border-transparent h-8"
            />
            <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <div className="flex items-center gap-0.5">
              <ExpandableAction
                icon={<Plus className="w-3.5 h-3.5" />}
                label={t('append_data')}
                onClick={handleAppend}
                className="text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-zinc-700 border-transparent h-8"
              />
              <ExpandableAction
                icon={<GitMerge className="w-3.5 h-3.5" />}
                label={t('merge_data')}
                onClick={handleMerge}
                className="text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-zinc-700 border-transparent h-8"
              />
              <ExpandableAction
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                label={t('replace_source')}
                onClick={handleReplace}
                className="text-amber-600 dark:text-amber-400 hover:bg-white dark:hover:bg-zinc-700 border-transparent h-8"
              />
            </div>
            <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <ExpandableAction
              icon={<Trash2 className="w-3.5 h-3.5" />}
              label={t('delete')}
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-zinc-700 border-transparent h-8"
            />
        </div>
      </header>

      {/* 2. Main Content Area with Tabs */}
      <FloatingActionLayout showAction={true}>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <TabsList className="h-12 bg-transparent gap-6 p-0">
              <TabsTrigger 
                value="columns" 
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-bold gap-2"
              >
                <FileCode className="w-3.5 h-3.5" />
                {t('columns')}
                <span className="bg-zinc-200/50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-md text-[9px] font-black">
                  {currentFile.columns.length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-bold gap-2"
              >
                <Table className="w-3.5 h-3.5" />
                {t('preview')}
              </TabsTrigger>
              <TabsTrigger 
                value="metrics" 
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-bold gap-2"
              >
                <Tag className="w-3.5 h-3.5" />
                {tAnalysis('smart_metrics')}
                <span className="bg-zinc-200/50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-md text-[9px] font-black">
                  {(currentFile.smartMetrics || []).length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="relations" 
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-bold gap-2"
              >
                <Link2 className="w-3.5 h-3.5" />
                {t('relationships')}
                <span className="bg-zinc-200/50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-md text-[9px] font-black">
                  {(currentFile.relations || []).length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="columns" className="flex-1 min-h-0 m-0 focus-visible:outline-none overflow-hidden p-6">
             <div className="h-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                <ColumnsView file={currentFile} />
             </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 min-h-0 m-0 focus-visible:outline-none overflow-hidden p-6">
             <div className="h-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden p-1">
                <DataPreviewPanel />
             </div>
          </TabsContent>

          <TabsContent value="metrics" className="flex-1 min-h-0 m-0 focus-visible:outline-none overflow-hidden p-6">
             <div className="h-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                <MetricsView file={currentFile} />
             </div>
          </TabsContent>

          <TabsContent value="relations" className="flex-1 min-h-0 m-0 focus-visible:outline-none overflow-hidden p-6">
             <div className="h-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                <RelationsView file={currentFile} />
             </div>
          </TabsContent>
        </Tabs>
      </FloatingActionLayout>

      {/* Modals */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteFile}
        title={t('delete_file_confirm_title')}
        description={t('delete_file_confirm_desc')}
        variant="destructive"
      />
      <ConfirmDialog
        open={showAnalyzeConfirm}
        onOpenChange={setShowAnalyzeConfirm}
        onConfirm={handleAnalyzeSemantics}
        title={t('analyze_confirm_title')}
        description={t('analyze_confirm_desc')}
        variant="default"
      />
      <DataLineageDialog
        open={showLineage}
        onOpenChange={setShowLineage}
        file={currentFile}
      />
      <SemanticReviewModal
        isOpen={showReviewModal}
        isAnalyzing={isAnalyzing}
        result={analysisResult}
        onCancel={() => setShowReviewModal(false)}
        onConfirm={handleApplySemanticReview}
      />
      {gateNode}
    </div>
  )
}
