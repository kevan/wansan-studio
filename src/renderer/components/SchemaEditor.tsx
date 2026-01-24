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
  GitMerge,
  Ban,
  Calculator,
  FileInput,
  Eye,
  EyeOff,
  Database,
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
  const [editingMetric, setEditingMetric] = useState<SmartMetric | undefined>(
    undefined
  )
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false)
  const [editingRelation, setEditingRelation] = useState<
    TableRelation | undefined
  >(undefined)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 2. Derive state
  const currentFileId =
    activeFileId && files.find(f => f.id === activeFileId)
      ? activeFileId
      : files[0]?.id
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

  const handleAddMetric = () => {
    setEditingMetric(undefined)
    setIsMetricModalOpen(true)
  }

  const handleEditMetric = (metric: SmartMetric) => {
    setEditingMetric(metric)
    setIsMetricModalOpen(true)
  }

  const handleSaveMetric = async (metric: Omit<SmartMetric, 'id'>) => {
    if (editingMetric) {
      await removeSmartMetric(currentFile.id, editingMetric.id)
    }

    const newMetric: SmartMetric = {
      ...metric,
      id: editingMetric ? editingMetric.id : crypto.randomUUID(),
    }

    await addSmartMetric(currentFile.id, newMetric)
    setIsMetricModalOpen(false)
    toast.addToast({
      title: editingMetric
        ? t('metric_updated', 'Metric Updated')
        : t('metric_added', 'Metric Added'),
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
      {/* Scrollable Area with large bottom padding to avoid button obstruction */}
      <div className="flex-1 overflow-y-auto min-h-0 relative bg-white pb-48">
        <div className="flex flex-col min-h-0">
          {/* Header */}
          <div className="flex flex-col gap-3 px-8 py-6 border-b border-zinc-100 bg-white shrink-0">
            <div className="flex items-start justify-between gap-4">
              {/* Title & Info Section */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 shrink-0">
                  <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
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

              {/* Actions Toolbar - Compact Capsule Style */}
              <div className="flex items-center p-1 bg-white border border-zinc-200/60 rounded-2xl shadow-sm shrink-0">
                {/* Analyze - Primary Action */}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAnalyzeSemantics}
                  disabled={isAnalyzing}
                  className="h-8 px-3 text-indigo-600 hover:bg-indigo-50 font-bold gap-1.5 rounded-xl mr-1"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}

                  <span className="text-[11px] uppercase tracking-widest">
                    AI Tag
                  </span>
                </Button>

                <div className="w-px h-4 bg-zinc-100 mx-1" />

                {/* Data Group */}

                <div className="flex items-center gap-0.5 px-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleAppend}
                          className="h-8 w-8 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>

                      <TooltipContent>
                        {t('append_data', 'Append')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleMerge}
                          className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <GitMerge className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>

                      <TooltipContent>
                        {t('merge_data', 'Merge')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleReplace}
                          className="h-8 w-8 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>

                      <TooltipContent>
                        {t('replace_data', 'Replace')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="w-px h-4 bg-zinc-100 mx-1" />

                {/* Danger Group */}

                <div className="pl-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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

              {/* Columns Tab */}
              <TabsContent value="columns" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 gap-3">
                  {currentFile.columns.map(col => {
                    const isVisible = col.semantic?.isVisibleToAI !== false
                    return (
                      <div
                        key={col.name}
                        className={cn(
                          'group flex items-center justify-between p-4 bg-white border rounded-2xl transition-all hover:border-zinc-300 hover:shadow-sm',
                          col.isPrimaryKey
                            ? 'border-indigo-100 bg-indigo-50/5'
                            : 'border-zinc-100',
                          !isVisible && 'opacity-60 bg-zinc-50/50'
                        )}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {/* PK Toggle */}
                          <button
                            onClick={() =>
                              toggleKeyColumn(currentFile.id, col.name)
                            }
                            className={cn(
                              'p-2.5 rounded-xl border transition-all shrink-0',
                              col.isPrimaryKey
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                                : 'bg-white border-zinc-100 text-zinc-300 hover:border-indigo-200 hover:text-indigo-600'
                            )}
                          >
                            <Key
                              className={cn(
                                'w-4 h-4',
                                col.isPrimaryKey && 'fill-current'
                              )}
                            />
                          </button>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-zinc-900 truncate">
                                {col.name}
                              </span>

                              {/* Semantic Aliases */}
                              {(col.semantic?.aliases || []).map(
                                (alias, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="bg-indigo-50 text-indigo-600 font-bold border-none text-[9px] px-1.5 py-0 rounded-md"
                                  >
                                    {alias}
                                  </Badge>
                                )
                              )}

                              {/* Legacy Alias */}
                              {col.alias &&
                                !col.semantic?.aliases?.includes(col.alias) && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-zinc-100 text-zinc-500 font-bold border-none text-[9px] px-1.5 py-0 rounded-md"
                                  >
                                    {col.alias}
                                  </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                                {COLUMN_TYPE_CONFIG[col.type]?.label ||
                                  col.type}
                              </span>
                              {col.semantic?.businessType && (
                                <>
                                  <div className="w-1 h-1 rounded-full bg-zinc-200" />
                                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                                    {col.semantic.businessType}
                                  </span>
                                </>
                              )}
                              {col.semantic?.description && (
                                <>
                                  <div className="w-1 h-1 rounded-full bg-zinc-200" />
                                  <span className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                                    {col.semantic.description}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Visibility Toggle (Permanent) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    updateColumnSemantic(
                                      currentFile.id,
                                      col.name,
                                      {
                                        isVisibleToAI: !isVisible,
                                      }
                                    )
                                  }}
                                  className={cn(
                                    'p-2 rounded-xl transition-all',
                                    isVisible
                                      ? 'text-zinc-300 hover:text-indigo-600 hover:bg-indigo-50'
                                      : 'text-red-500 bg-red-50 hover:bg-red-100'
                                  )}
                                >
                                  {isVisible ? (
                                    <Eye className="w-4 h-4" />
                                  ) : (
                                    <EyeOff className="w-4 h-4" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isVisible ? 'Visible to AI' : 'Hidden from AI'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="mt-0">
                <div className="grid grid-cols-1 gap-4">
                  {(currentFile.smartMetrics || []).map(metric => (
                    <div
                      key={metric.id}
                      className="p-5 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group hover:border-zinc-300 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900">
                            {metric.name}
                          </h4>
                          <code className="text-[10px] text-zinc-400 mt-1 block bg-zinc-50 px-1.5 py-0.5 rounded">
                            {metric.sqlExpression}
                          </code>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMetric(metric)}
                          className="h-9 w-9 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeSmartMetric(currentFile.id, metric.id)
                          }
                          className="h-9 w-9 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={handleAddMetric}
                    className="h-20 border-dashed border-zinc-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/20 text-zinc-400 hover:text-indigo-600 transition-all flex flex-col gap-1"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {t('add_metric', 'Add Smart Metric')}
                    </span>
                  </Button>
                </div>
              </TabsContent>

              {/* Relations Tab */}
              <TabsContent value="relations" className="mt-0">
                <div className="grid grid-cols-1 gap-4">
                  {(currentFile.relations || []).map(rel => (
                    <div
                      key={rel.id}
                      className="p-5 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group hover:border-zinc-300 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-50 rounded-xl text-pink-600">
                          <Link2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900">
                              {rel.sourceColumn}
                            </span>
                            <ArrowRightLeft className="w-3 h-3 text-zinc-300" />
                            <span className="text-sm font-bold text-zinc-900">
                              {files.find(f => f.id === rel.targetFileId)?.name}
                              .{rel.targetColumn}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-black">
                            {rel.joinType || 'LEFT'}
                          </p>
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
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {t('add_relationship', 'Add Relationship')}
                    </span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
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
        file={currentFile}
      />

      <RelationEditorModal
        isOpen={isRelationModalOpen}
        onClose={() => setIsRelationModalOpen(false)}
        onSave={handleSaveRelation}
        initialRelation={editingRelation}
        sourceFile={currentFile}
        allFiles={files}
      />

      {gateNode}
    </div>
  )
}
