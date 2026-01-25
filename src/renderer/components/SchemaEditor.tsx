import React, { useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useWizardStore } from '@/stores/useWizardStore'
import { useTranslation } from 'react-i18next'
import { useToastStore } from '@/stores/useToastStore'
import { useProGate } from '@/hooks/use-pro-gate'
import {
  ArrowRightLeft,
  Database,
  Edit2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  GitMerge,
  Hash,
  Info,
  Key,
  Layout,
  Link2,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { ColumnSchema, SmartMetric, TableRelation } from '@shared/types'
import { Button } from './ui/button'
import { ExpandableAction } from './ui/expandable-action'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { ConfirmDialog } from './modals/ConfirmDialog'
import { MetricEditorModal } from './modals/metric-editor-modal'
import { RelationEditorModal } from './modals/RelationEditorModal'
import { DataLineageDialog } from './modals/DataLineageDialog'
import { SemanticEditorModal } from './modals/SemanticEditorModal'
import { COLUMN_TYPE_CONFIG } from '@/src/lib/constants'

export function SchemaEditor() {
  const files = useProjectStore(s => s.files)
  const activeFileId = useProjectStore(s => s.activeFileId)
  const updateColumnSemantic = useProjectStore(s => s.updateColumnSemantic)
  const removeFile = useProjectStore(s => s.removeFile)
  const addSmartMetric = useProjectStore(s => s.addSmartMetric)
  const removeSmartMetric = useProjectStore(s => s.removeSmartMetric)
  const addRelation = useProjectStore(s => s.addRelation)
  const removeRelation = useProjectStore(s => s.removeRelation)
  const openWizard = useWizardStore(s => s.open)

  const { t, i18n } = useTranslation('common')
  const { t: tAnalysis } = useTranslation('analysis')
  const { checkGate, gateNode } = useProGate()
  const toast = useToastStore()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAnalyzeConfirm, setShowAnalyzeConfirm] = useState(false)
  const [showLineage, setShowLineage] = useState(false)
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<SmartMetric | undefined>(
    undefined
  )

  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false)

  const [editingRelation, setEditingRelation] = useState<
    TableRelation | undefined
  >(undefined)

  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [editingColumn, setEditingColumn] = useState<ColumnSchema | null>(null)

  const currentFileId =
    activeFileId && files.find(f => f.id === activeFileId)
      ? activeFileId
      : files[0]?.id

  const currentFile = files.find(f => f.id === currentFileId)

  if (!currentFile) return null

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
  const handleAddMetric = () => {
    setEditingMetric(undefined)
    setIsMetricModalOpen(true)
  }
  const handleEditMetric = (metric: SmartMetric) => {
    setEditingMetric(metric)
    setIsMetricModalOpen(true)
  }
  const handleSaveMetric = async (metric: Omit<SmartMetric, 'id'>) => {
    if (editingMetric) await removeSmartMetric(currentFile.id, editingMetric.id)
    const newMetric: SmartMetric = {
      ...metric,
      id: editingMetric ? editingMetric.id : crypto.randomUUID(),
    }
    await addSmartMetric(currentFile.id, newMetric)
    setIsMetricModalOpen(false)
    toast.addToast({
      title: editingMetric ? t('metric_updated') : t('metric_added'),
      type: 'success',
    })
  }
  const handleSaveRelation = async (relation: TableRelation) => {
    if (editingRelation) await removeRelation(editingRelation.id)
    await addRelation({ ...relation, sourceFileId: currentFile.id })
    toast.addToast({
      title: editingRelation
        ? t('relationship_updated')
        : t('relationship_added'),
      type: 'success',
    })
  }
  const handleEditRelation = (rel: TableRelation) => {
    setEditingRelation(rel)
    setIsRelationModalOpen(true)
  }
  const handleDeleteRelation = async (relId: string) => {
    await removeRelation(relId)
    toast.addToast({ title: t('relationship_removed'), type: 'success' })
  }
  const handleOpenSemanticEdit = (col: ColumnSchema) => {
    setEditingColumn(col)
  }
  const handleSaveSemantic = (data: {
    aliases: string[]
    description: string
    businessType: string
  }) => {
    if (!editingColumn) return
    updateColumnSemantic(currentFile.id, editingColumn.name, data)
    setEditingColumn(null)
    toast.addToast({
      title: t('semantic_updated', 'Metadata Updated'),
      type: 'success',
    })
  }

  const handleAnalyzeSemantics = async () => {
    if (!currentFile) return
    setShowAnalyzeConfirm(false)
    setIsAnalyzing(true)
    try {
      const language = i18n.language.startsWith('zh') ? 'zh' : 'en'
      const aiRes = await window.electronAPI.analyzeSemantics(
        currentFile.tableName,
        currentFile.columns,
        language
      )
      if (!aiRes.success || !aiRes.data)
        throw new Error(aiRes.error || 'AI analysis failed')
      Object.entries(aiRes.data).forEach(([colName, semantic]) => {
        updateColumnSemantic(currentFile.id, colName, semantic)
      })
      toast.addToast({
        title: t('semantics_analysis_complete', 'Semantics Analysis Complete'),
        type: 'success',
      })
    } catch (e: any) {
      toast.addToast({
        title: t('analysis_failed', 'Analysis Failed'),
        description: e.message,
        type: 'error',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative text-zinc-900">
      {/* 1. Main Static Header - Relative for floating toolbar */}
      <div className="flex flex-col gap-3 px-6 py-5 border-b border-zinc-100 bg-white shrink-0 z-30 relative shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-100 shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex flex-col min-w-0 text-zinc-900">
              <h2 className="text-xl font-bold tracking-tight truncate leading-tight">
                {currentFile.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <button
                  onClick={() => setShowLineage(true)}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-50 text-zinc-500 rounded-md border border-zinc-100 whitespace-nowrap hover:bg-zinc-100 hover:text-zinc-900 transition-all cursor-help group"
                  title={t('data_lineage')}
                >
                  <Database className="w-2.5 h-2.5 opacity-70 group-hover:text-indigo-600" />
                  <code className="text-[10px] font-mono">
                    {currentFile.tableName}
                  </code>
                  <Info className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 ml-0.5" />
                </button>

                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 whitespace-nowrap">
                  <Hash className="w-2.5 h-2.5" />
                  <span className="text-[10px] font-black uppercase tracking-tight">
                    {currentFile.rowCount?.toLocaleString() || 0} {t('rows')}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 whitespace-nowrap">
                  <Layout className="w-2.5 h-2.5" />
                  <span className="text-[10px] font-black uppercase tracking-tight">
                    {currentFile.columns.length} {t('columns')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Actions Toolbar */}
          <div className="absolute top-5 right-6 flex items-center p-1 bg-white/90 backdrop-blur-md border border-zinc-200/60 rounded-2xl shadow-xl shadow-zinc-200/40 shrink-0 animate-in fade-in slide-in-from-right-2 duration-500">
            <ExpandableAction
              icon={
                isAnalyzing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )
              }
              label={t('ai_tag', 'AI Semantics')}
              onClick={() => setShowAnalyzeConfirm(true)}
              disabled={isAnalyzing}
              className="text-indigo-600 hover:bg-indigo-50 border-transparent"
            />

            <div className="w-px h-4 bg-zinc-100 mx-1" />

            <div className="flex items-center gap-0.5">
              <ExpandableAction
                icon={<Plus className="w-4 h-4" />}
                label={t('append_data')}
                onClick={handleAppend}
                className="text-emerald-600 hover:bg-emerald-50 border-transparent"
              />
              <ExpandableAction
                icon={<GitMerge className="w-4 h-4" />}
                label={t('merge_data')}
                onClick={handleMerge}
                className="text-indigo-600 hover:bg-indigo-50 border-transparent"
              />
              <ExpandableAction
                icon={<RefreshCw className="w-4 h-4" />}
                label={t('replace_source')}
                onClick={handleReplace}
                className="text-amber-600 hover:bg-amber-50 border-transparent"
              />
            </div>

            <div className="w-px h-4 bg-zinc-100 mx-1" />

            <ExpandableAction
              icon={<Trash2 className="w-4 h-4" />}
              label={t('delete')}
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:bg-red-50 border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto min-h-0 relative bg-white pb-48 scroll-smooth">
        <Tabs defaultValue="columns" className="w-full relative">
          {/* Sticky Tab Navigation */}
          <div className="sticky top-0 z-20 bg-white border-b border-zinc-100 flex justify-center px-4 h-16 shrink-0">
            <TabsList className="bg-zinc-100/50 p-1 rounded-xl self-center">
              <TabsTrigger
                value="columns"
                className="rounded-lg text-xs font-bold px-6 gap-2"
              >
                {t('columns')}
                <span className="bg-zinc-200/50 text-zinc-500 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                  {currentFile.columns.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="metrics"
                className="rounded-lg text-xs font-bold px-6 gap-2"
              >
                {tAnalysis('smart_metrics')}
                <span className="bg-zinc-200/50 text-zinc-500 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                  {(currentFile.smartMetrics || []).length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="relations"
                className="rounded-lg text-xs font-bold px-6 gap-2"
              >
                {t('relationships')}
                <span className="bg-zinc-200/50 text-zinc-500 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                  {(currentFile.relations || []).length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="columns"
            className="mt-0 focus-visible:outline-none relative z-0"
          >
            <div className="flex flex-col">
              {/* Sticky List Header */}
              {/*<div className="sticky top-[64px] z-10 bg-zinc-50 border-b border-zinc-200 px-8 py-2.5 flex items-center gap-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest shrink-0 shadow-sm">*/}
              {/*  <div className="w-16 shrink-0">{t('list_status')}</div>*/}
              {/*  <div className="w-48 shrink-0">{t('list_field_type')}</div>*/}
              {/*  <div className="flex-1">{t('list_semantic_samples')}</div>*/}
              {/*  <div className="w-12 text-right">{t('list_edit')}</div>*/}
              {/*</div>*/}

              <div className="px-4 py-6">
                <div className="flex flex-col border border-zinc-100 rounded-2xl overflow-hidden divide-y divide-zinc-50 z-0 relative">
                  {currentFile.columns.map(col => {
                    const isVisible = col.semantic?.isVisibleToAI !== false
                    return (
                      <div
                        key={col.name}
                        className={cn(
                          'group flex items-center gap-4 px-4 py-3 bg-white hover:bg-zinc-50/50 transition-colors',
                          !isVisible && 'opacity-60 bg-zinc-50/20'
                        )}
                      >
                        <div className="w-16 shrink-0 flex items-center gap-1.5">
                          <div
                            className={cn(
                              'p-1.5 rounded-lg border transition-all',
                              col.isPrimaryKey
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white border-zinc-100 text-zinc-200'
                            )}
                          >
                            <Key
                              className={cn(
                                'w-3 h-3',
                                col.isPrimaryKey && 'fill-current'
                              )}
                            />
                          </div>
                          <button
                            onClick={() =>
                              updateColumnSemantic(currentFile.id, col.name, {
                                isVisibleToAI: !isVisible,
                              })
                            }
                            className={cn(
                              'p-1.5 rounded-lg transition-all border',
                              isVisible
                                ? 'text-zinc-300 border-transparent hover:border-zinc-200 hover:text-indigo-600'
                                : 'text-red-500 bg-red-50 border-red-100'
                            )}
                          >
                            {isVisible ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="w-48 shrink-0 flex flex-col min-w-0">
                          <span
                            className="text-sm font-bold text-zinc-900 truncate block leading-none mb-1.5"
                            title={col.name}
                          >
                            {col.name}
                          </span>
                          <span className="text-[9px] font-black uppercase text-zinc-400 tracking-tighter leading-none">
                            {COLUMN_TYPE_CONFIG[col.type]?.label
                              ? t(COLUMN_TYPE_CONFIG[col.type]?.label)
                              : col.type}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center gap-6 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-[200px] shrink-0">
                            {col.semantic?.businessType && (
                              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-indigo-100/50">
                                {col.semantic.businessType}
                              </span>
                            )}
                            {(col.semantic?.aliases || [])
                              .slice(0, 2)
                              .map((alias, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="bg-zinc-100 text-zinc-600 font-bold border-none text-[9px] px-1.5 py-0 rounded-md"
                                >
                                  {alias}
                                </Badge>
                              ))}
                          </div>
                          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity">
                            <div className="w-px h-4 bg-zinc-200 shrink-0" />
                            <div className="flex items-center gap-1.5 truncate">
                              {(col.sampleValues || [])
                                .slice(0, 3)
                                .map((val, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-mono bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100/50 whitespace-nowrap text-zinc-600"
                                  >
                                    {typeof val === 'object'
                                      ? '{...}'
                                      : String(val)}
                                  </span>
                                ))}
                              {(col.sampleValues || []).length === 0 && (
                                <span className="text-[10px] italic text-zinc-400">
                                  {t('no_samples')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-12 shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenSemanticEdit(col)}
                            className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="metrics"
            className="mt-0 px-4 py-6 focus-visible:outline-none relative z-0"
          >
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
                  {t('add_metric')}
                </span>
              </Button>
            </div>
          </TabsContent>

          <TabsContent
            value="relations"
            className="mt-0 px-4 py-6 focus-visible:outline-none relative z-0"
          >
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
                          {files.find(f => f.id === rel.targetFileId)?.name}.
                          {rel.targetColumn}
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
                  {t('add_relationship')}
                </span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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

      <SemanticEditorModal
        isOpen={!!editingColumn}
        onClose={() => setEditingColumn(null)}
        onSave={handleSaveSemantic}
        column={editingColumn}
      />
      {gateNode}
    </div>
  )
}
