import React, { useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useWizardStore } from '@/stores/useWizardStore'
import { useTranslation } from 'react-i18next'
import { useToastStore } from '@/stores/useToastStore'
import { useProGate } from '@/hooks/use-pro-gate'
import {
  ArrowRightLeft,
  Edit2,
  FileSpreadsheet,
  Key,
  Link2,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
  Ban,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { TableRelation, SmartMetric } from '@shared/types'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { ExpandableAction } from './ui/expandable-action'
import { ConfirmDialog } from './modals/ConfirmDialog'
import { MetricEditorModal } from './modals/metric-editor-modal'
import { RelationEditorModal } from './modals/RelationEditorModal'
import { COLUMN_TYPE_CONFIG } from '@/src/lib/constants'

export function SchemaEditor() {
  const files = useProjectStore(s => s.files)
  const activeFileId = useProjectStore(s => s.activeFileId)
  const toggleKeyColumn = useProjectStore(s => s.toggleKeyColumn)
  const updateColumnSemantic = useProjectStore(s => s.updateColumnSemantic)
  const removeFile = useProjectStore(s => s.removeFile)
  const addSmartMetric = useProjectStore(s => s.addSmartMetric)
  const removeSmartMetric = useProjectStore(s => s.removeSmartMetric)
  const addRelation = useProjectStore(s => s.addRelation)
  const removeRelation = useProjectStore(s => s.removeRelation)
  const openWizard = useWizardStore(s => s.open)

  const { t } = useTranslation('common')
  const { t: tAnalysis } = useTranslation('analysis')
  const { checkGate, gateNode } = useProGate()
  const toast = useToastStore()

  // 1. All Hooks must be at top level
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<SmartMetric | undefined>(undefined)
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false)
  const [editingRelation, setEditingRelation] = useState<TableRelation | undefined>(undefined)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 2. Derive state
  const currentFileId = activeFileId && files.find(f => f.id === activeFileId) ? activeFileId : files[0]?.id
  const currentFile = files.find(f => f.id === currentFileId)

  if (!currentFile) return null

  // --- Handlers ---
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
    toast.addToast({
      title: t('file_deleted'),
      type: 'success',
      duration: 2000,
    })
  }

  const handleSaveMetric = async (metric: Omit<SmartMetric, 'id'>) => {
    if (editingMetric) {
      // Logic for update if needed, currently we just add
    }
    await addSmartMetric(currentFile.id, metric)
    setIsMetricModalOpen(false)
    toast.addToast({
      title: t('metric_added', 'Metric Added'),
      type: 'success',
      duration: 2000,
    })
  }

  const handleSaveRelation = async (relation: TableRelation) => {
    if (editingRelation) {
      await removeRelation(editingRelation.id)
    }
    await addRelation({
      ...relation,
      sourceFileId: currentFile.id,
    })
    toast.addToast({
      title: editingRelation
        ? t('relationship_updated', 'Relation Updated')
        : t('relationship_added', 'Relation Added'),
      type: 'success',
      duration: 2000,
    })
  }

  const handleEditRelation = (rel: TableRelation) => {
    setEditingRelation(rel)
    setIsRelationModalOpen(true)
  }

  const handleDeleteRelation = async (relId: string) => {
    await removeRelation(relId)
    toast.addToast({
      title: t('relationship_removed'),
      type: 'success',
      duration: 2000,
    })
  }

  const handleAnalyzeSemantics = async () => {
    if (!currentFile) return
    setIsAnalyzing(true)
    try {
      const res = await window.electronAPI.runSQL(
        `SELECT * FROM "${currentFile.tableName}" LIMIT 10`
      )
      if (!res.success || !res.data) throw new Error('Failed to fetch samples')

      const colNames = currentFile.columns.map(c => c.name)
      const rows: any[][] = res.data.data.map((row: any) =>
        colNames.map(name => row[name])
      )

      const aiRes = await window.electronAPI.analyzeSemantics(
        currentFile.tableName,
        currentFile.columns,
        rows
      )

      if (!aiRes.success || !aiRes.data)
        throw new Error(aiRes.error || 'AI analysis failed')

      const semanticMap = aiRes.data
      Object.entries(semanticMap).forEach(([colName, semantic]) => {
        updateColumnSemantic(currentFile.id, colName, semantic)
      })

      toast.addToast({
        title: 'Semantics Analysis Complete',
        description: 'Suggested aliases and visibility applied.',
        type: 'success',
      })
    } catch (e: any) {
      console.error('Semantic analysis failed', e)
      toast.addToast({
        title: 'Analysis Failed',
        description: e.message,
        type: 'error',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto min-h-0 relative bg-white pb-32">
        <div className="flex flex-col min-h-0">
          {/* Header */}
          <div className="flex flex-col gap-3 px-8 py-5 border-b border-zinc-100 bg-white shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 pt-0.5">
                <div className="p-2 bg-green-50 rounded-xl border border-green-100 shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight truncate">
                    {currentFile.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-[10px] font-mono text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                      {currentFile.tableName}
                    </code>
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter">
                      {currentFile.rowCount.toLocaleString()} Rows
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyzeSemantics}
                  disabled={isAnalyzing}
                  className="bg-white border-zinc-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 font-bold gap-2 rounded-xl h-9"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {t('analyze_semantics', 'Analyze Semantics')}
                </Button>

                <div className="h-4 w-px bg-zinc-100 mx-1" />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleReplace}
                        className="h-9 w-9 border-zinc-200 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('replace_data', 'Replace')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="h-9 w-9 border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('delete')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            <Tabs defaultValue="columns" className="w-full">
              <TabsList className="bg-zinc-100/50 p-1 rounded-xl mb-8">
                <TabsTrigger
                  value="columns"
                  className="rounded-lg text-xs font-bold px-6"
                >
                  {t('columns')}
                </TabsTrigger>
                <TabsTrigger
                  value="metrics"
                  className="rounded-lg text-xs font-bold px-6"
                >
                  {tAnalysis('smart_metrics')}
                </TabsTrigger>
                <TabsTrigger
                  value="relations"
                  className="rounded-lg text-xs font-bold px-6"
                >
                  {t('relationships')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="columns" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 gap-3">
                  {currentFile.columns.map(col => (
                    <div
                      key={col.name}
                      className={cn(
                        "group flex items-center justify-between p-4 bg-white border rounded-2xl transition-all hover:border-zinc-300 hover:shadow-sm",
                        col.isPrimaryKey ? "border-indigo-100 bg-indigo-50/10" : "border-zinc-100"
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <button
                          onClick={() => toggleKeyColumn(currentFile.id, col.name)}
                          className={cn(
                            "p-2.5 rounded-xl border transition-all",
                            col.isPrimaryKey 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                              : "bg-white border-zinc-100 text-zinc-300 hover:border-indigo-200 hover:text-indigo-600"
                          )}
                        >
                          <Key className={cn("w-4 h-4", col.isPrimaryKey && "fill-current")} />
                        </button>
                        
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900 truncate">{col.name}</span>
                            {col.alias && (
                              <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 font-bold border-none text-[10px] rounded-lg">
                                {col.alias}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                              {COLUMN_TYPE_CONFIG[col.type]?.label || col.type}
                            </span>
                            {col.semanticType && (
                              <>
                                <div className="w-1 h-1 rounded-full bg-zinc-200" />
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                                  {col.semanticType}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => {
                             updateColumnSemantic(currentFile.id, col.name, {
                               isVisibleToAI: !col.isVisibleToAI
                             })
                           }}
                           className={cn(
                             "h-8 rounded-lg font-bold text-[10px] gap-1.5",
                             col.isVisibleToAI ? "text-zinc-500" : "text-red-500 bg-red-50"
                           )}
                         >
                           {col.isVisibleToAI ? <Wand2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                           {col.isVisibleToAI ? "AI Ready" : "AI Hidden"}
                         </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="mt-0">
                <div className="grid grid-cols-1 gap-4">
                  {(currentFile.smartMetrics || []).map(metric => (
                    <div key={metric.id} className="p-5 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group hover:border-zinc-300 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900">{metric.name}</h4>
                          <code className="text-[10px] text-zinc-400 mt-1 block bg-zinc-50 px-1.5 py-0.5 rounded">{metric.expression}</code>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSmartMetric(currentFile.id, metric.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingMetric(undefined)
                      setIsMetricModalOpen(true)
                    }}
                    className="h-20 border-dashed border-zinc-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/20 text-zinc-400 hover:text-indigo-600 transition-all flex flex-col gap-1"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">{t('add_metric', 'Add Smart Metric')}</span>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="relations" className="mt-0">
                <div className="grid grid-cols-1 gap-4">
                  {useProjectStore.getState().relations[currentFile.id]?.map(rel => (
                    <div key={rel.id} className="p-5 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group hover:border-zinc-300 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-50 rounded-xl text-pink-600">
                          <Link2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900">{rel.sourceColumn}</span>
                            <ArrowRightLeft className="w-3 h-3 text-zinc-300" />
                            <span className="text-sm font-bold text-zinc-900">
                              {files.find(f => f.id === rel.targetFileId)?.name}.{rel.targetColumn}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-black">{rel.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRelation(rel)}
                          className="h-9 w-9 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRelation(rel.id)}
                          className="h-9 w-9 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingRelation(undefined)
                      setIsRelationModalOpen(true)
                    }}
                    className="h-20 border-dashed border-zinc-200 rounded-2xl hover:border-pink-300 hover:bg-pink-50/20 text-zinc-400 hover:text-pink-600 transition-all flex flex-col gap-1"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">{t('add_relationship', 'Add Relationship')}</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Floating Action Bar (Bottom) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-2xl rounded-2xl z-40">
        <ExpandableAction
          icon={<Plus className="w-4 h-4" />}
          label={t('append_data')}
          onClick={handleAppend}
          variant="primary"
        />
        <div className="w-px h-6 bg-zinc-200 mx-1" />
        <ExpandableAction
          icon={<ArrowRightLeft className="w-4 h-4" />}
          label={t('merge_data')}
          onClick={handleMerge}
          variant="secondary"
        />
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteFile}
        title={t('delete_file_confirm_title')}
        description={t('delete_file_confirm_desc')}
        variant="destructive"
      />

      <MetricEditorModal
        isOpen={isMetricModalOpen}
        onClose={() => setIsMetricModalOpen(false)}
        onSave={handleSaveMetric}
        initialMetric={editingMetric}
        columns={currentFile.columns}
      />

      <RelationEditorModal
        isOpen={isRelationModalOpen}
        onClose={() => setIsRelationModalOpen(false)}
        onSave={handleSaveRelation}
        initialRelation={editingRelation}
        sourceFile={currentFile}
        availableFiles={files.filter(f => f.id !== currentFile.id)}
      />

      {gateNode}
    </div>
  )
}