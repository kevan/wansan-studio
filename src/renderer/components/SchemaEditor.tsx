import React, { useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useWizardStore } from '@/stores/useWizardStore'
import { useTranslation } from 'react-i18next'
import { useToastStore } from '@/stores/useToastStore'
import { useProGate } from '@/hooks/use-pro-gate'
import {
  ArrowRightLeft,
  Edit2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  GitMerge,
  Key,
  Link2,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  Calculator,
  FileInput,
  Hash,
  MessageSquare,
  Layout,
  Database
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { SmartMetric, TableRelation, ColumnSchema } from '@shared/types'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { ConfirmDialog } from './modals/ConfirmDialog'
import { MetricEditorModal } from './modals/metric-editor-modal'
import { RelationEditorModal } from './modals/RelationEditorModal'
import { COLUMN_TYPE_CONFIG } from '@/src/lib/constants'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

const BUSINESS_TYPES = [
  'ID',
  'Code',
  'Money',
  'Category',
  'Text',
  'Date',
  'Time',
  'Quantity',
  'Location',
  'Other',
]

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

  const { t, i18n } = useTranslation('common')
  const { t: tAnalysis } = useTranslation('analysis')
  const { checkGate, gateNode } = useProGate()
  const toast = useToastStore()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<SmartMetric | undefined>(undefined)
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false)
  const [editingRelation, setEditingRelation] = useState<TableRelation | undefined>(undefined)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const [editingColumn, setEditingColumn] = useState<ColumnSchema | null>(null)
  const [editAliases, setEditAliases] = useState<string[]>([])
  const [newAliasInput, setNewAliasInput] = useState('')
  const [editDesc, setEditDescription] = useState('')
  const [editBusinessType, setEditBusinessType] = useState('')

  const currentFileId = activeFileId && files.find(f => f.id === activeFileId) ? activeFileId : files[0]?.id
  const currentFile = files.find(f => f.id === currentFileId)

  if (!currentFile) return null

  const handleAppend = () => { checkGate(t('append_data', 'Append'), () => { openWizard('append', currentFile.id) }) }
  const handleMerge = () => { checkGate(t('merge_data', 'Merge'), () => { openWizard('merge', currentFile.id) }) }
  const handleReplace = () => { openWizard('replace', currentFile.id) }
  const handleDeleteFile = async () => { await removeFile(currentFile.id); setShowDeleteConfirm(false); toast.addToast({ title: t('file_deleted'), type: 'success' }) }
  const handleAddMetric = () => { setEditingMetric(undefined); setIsMetricModalOpen(true) }
  const handleEditMetric = (metric: SmartMetric) => { setEditingMetric(metric); setIsMetricModalOpen(true) }
  const handleSaveMetric = async (metric: Omit<SmartMetric, 'id'>) => {
    if (editingMetric) await removeSmartMetric(currentFile.id, editingMetric.id)
    const newMetric: SmartMetric = { ...metric, id: editingMetric ? editingMetric.id : crypto.randomUUID() }
    await addSmartMetric(currentFile.id, newMetric); setIsMetricModalOpen(false)
    toast.addToast({ title: editingMetric ? t('metric_updated') : t('metric_added'), type: 'success' })
  }
  const handleSaveRelation = async (relation: TableRelation) => {
    if (editingRelation) await removeRelation(editingRelation.id)
    await addRelation({ ...relation, sourceFileId: currentFile.id })
    toast.addToast({ title: editingRelation ? t('relationship_updated') : t('relationship_added'), type: 'success' })
  }
  const handleEditRelation = (rel: TableRelation) => { setEditingRelation(rel); setIsRelationModalOpen(true) }
  const handleDeleteRelation = async (relId: string) => { await removeRelation(relId); toast.addToast({ title: t('relationship_removed'), type: 'success' }) }
  const handleOpenSemanticEdit = (col: ColumnSchema) => { setEditingColumn(col); setEditAliases(col.semantic?.aliases || []); setEditDescription(col.semantic?.description || ''); setEditBusinessType(col.semantic?.businessType || 'Other'); setNewAliasInput('') }
  const handleAddAlias = () => { const val = newAliasInput.trim(); if (val && !editAliases.includes(val)) { setEditAliases([...editAliases, val]); setNewAliasInput('') } }
  const handleRemoveAlias = (aliasToRemove: string) => { setEditAliases(editAliases.filter(a => a !== aliasToRemove)) }
  const handleSaveSemantic = () => { if (!editingColumn) return; updateColumnSemantic(currentFile.id, editingColumn.name, { aliases: editAliases, description: editDesc, businessType: editBusinessType }); setEditingColumn(null); toast.addToast({ title: t('semantic_updated', 'Metadata Updated'), type: 'success' }) }
  const handleAnalyzeSemantics = async () => {
    if (!currentFile) return; setIsAnalyzing(true)
    try {
      const language = i18n.language.startsWith('zh') ? 'zh' : 'en'
      const aiRes = await window.electronAPI.analyzeSemantics(currentFile.tableName, currentFile.columns, language)
      if (!aiRes.success || !aiRes.data) throw new Error(aiRes.error || 'AI analysis failed')
      Object.entries(aiRes.data).forEach(([colName, semantic]) => { updateColumnSemantic(currentFile.id, colName, semantic) })
      toast.addToast({ title: 'Semantics Analysis Complete', type: 'success' })
    } catch (e: any) { toast.addToast({ title: 'Analysis Failed', description: e.message, type: 'error' }) } finally { setIsAnalyzing(false) }
  }

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative text-zinc-900">
      {/* 1. Main Static Header - Lowered Z-Index to avoid covering modals */}
      <div className="flex flex-col gap-3 px-6 py-5 border-b border-zinc-100 bg-white shrink-0 z-30 relative shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-100 shrink-0"><FileSpreadsheet className="w-6 h-6 text-indigo-600" /></div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-xl font-bold tracking-tight truncate leading-tight">{currentFile.name}</h2>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-50 text-zinc-500 rounded-md border border-zinc-100 whitespace-nowrap"><Database className="w-2.5 h-2.5 opacity-70" /><code className="text-[10px] font-mono">{currentFile.tableName}</code></div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 whitespace-nowrap"><Hash className="w-2.5 h-2.5" /><span className="text-[10px] font-black uppercase tracking-tight">{currentFile.rowCount?.toLocaleString() || 0} Rows</span></div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 whitespace-nowrap"><Layout className="w-2.5 h-2.5" /><span className="text-[10px] font-black uppercase tracking-tight">{currentFile.columns.length} Columns</span></div>
              </div>
            </div>
          </div>
          <div className="flex items-center p-1 bg-white border border-zinc-200/60 rounded-2xl shadow-sm shrink-0">
            <Button variant="ghost" size="sm" onClick={handleAnalyzeSemantics} disabled={isAnalyzing} className="h-8 px-3 text-indigo-600 hover:bg-indigo-50 font-bold gap-1.5 rounded-xl mr-1">{isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}<span className="text-[11px] uppercase tracking-widest">AI Tag</span></Button>
            <div className="w-px h-4 bg-zinc-100 mx-1" />
            <div className="flex items-center gap-0.5 px-1">
              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleAppend} className="h-8 w-8 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Plus className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>{t('append_data')}</TooltipContent></Tooltip></TooltipProvider>
              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleMerge} className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><GitMerge className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>{t('merge_data')}</TooltipContent></Tooltip></TooltipProvider>
              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleReplace} className="h-8 w-8 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><RefreshCw className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>{t('replace_data')}</TooltipContent></Tooltip></TooltipProvider>
            </div>
            <div className="w-px h-4 bg-zinc-100 mx-1" /><div className="pl-1"><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)} className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>{t('delete')}</TooltipContent></Tooltip></TooltipProvider></div>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto min-h-0 relative bg-white pb-48 scroll-smooth">
        <Tabs defaultValue="columns" className="w-full relative">
          {/* Sticky Tab Navigation - Centered, Z-20 */}
          <div className="sticky top-0 z-20 bg-white border-b border-zinc-100 flex justify-center px-4 h-16 shrink-0">
            <TabsList className="bg-zinc-100/50 p-1 rounded-xl self-center">
              <TabsTrigger value="columns" className="rounded-lg text-xs font-bold px-6 gap-2">{t('columns')}<span className="bg-zinc-200/50 text-zinc-500 px-1.5 py-0.5 rounded-md text-[10px] font-black">{currentFile.columns.length}</span></TabsTrigger>
              <TabsTrigger value="metrics" className="rounded-lg text-xs font-bold px-6 gap-2">{tAnalysis('smart_metrics')}<span className="bg-zinc-200/50 text-zinc-500 px-1.5 py-0.5 rounded-md text-[10px] font-black">{(currentFile.smartMetrics || []).length}</span></TabsTrigger>
              <TabsTrigger value="relations" className="rounded-lg text-xs font-bold px-6 gap-2">{t('relationships')}<span className="bg-zinc-200/50 text-zinc-500 px-1.5 py-0.5 rounded-md text-[10px] font-black">{(currentFile.relations || []).length}</span></TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="columns" className="mt-0 focus-visible:outline-none relative z-0">
            <div className="flex flex-col">
              {/* Sticky List Header - Z-10 */}
              <div className="sticky top-[64px] z-10 bg-zinc-50 border-b border-zinc-200 px-8 py-2.5 flex items-center gap-4 text-[10px] font-black uppercase text-zinc-400 tracking-widest shrink-0 shadow-sm">
                <div className="w-16 shrink-0">Status</div>
                <div className="w-48 shrink-0">Field & Type</div>
                <div className="flex-1">Semantic & Samples</div>
                <div className="w-12 text-right">Edit</div>
              </div>

              <div className="px-4 py-6">
                <div className="flex flex-col border border-zinc-100 rounded-2xl overflow-hidden divide-y divide-zinc-50 z-0 relative">
                  {currentFile.columns.map(col => {
                    const isVisible = col.semantic?.isVisibleToAI !== false;
                    return (
                      <div key={col.name} className={cn("group flex items-center gap-4 px-4 py-3 bg-white hover:bg-zinc-50/50 transition-colors", !isVisible && "opacity-60 bg-zinc-50/20")}>
                        <div className="w-16 shrink-0 flex items-center gap-1.5">
                          <div className={cn("p-1.5 rounded-lg border transition-all", col.isPrimaryKey ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" : "bg-white border-zinc-100 text-zinc-200")}><Key className={cn("w-3 h-3", col.isPrimaryKey && "fill-current")} /></div>
                          <button onClick={() => updateColumnSemantic(currentFile.id, col.name, { isVisibleToAI: !isVisible })} className={cn("p-1.5 rounded-lg transition-all border", isVisible ? "text-zinc-300 border-transparent hover:border-zinc-200 hover:text-indigo-600" : "text-red-500 bg-red-50 border-red-100")}>{isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                        </div>
                        <div className="w-48 shrink-0 flex flex-col min-w-0"><span className="text-sm font-bold text-zinc-900 truncate block leading-none mb-1.5" title={col.name}>{col.name}</span><span className="text-[9px] font-black uppercase text-zinc-400 tracking-tighter leading-none">{COLUMN_TYPE_CONFIG[col.type]?.label ? t(COLUMN_TYPE_CONFIG[col.type]?.label) : col.type}</span></div>
                        <div className="flex-1 flex items-center gap-6 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-[200px] shrink-0">{col.semantic?.businessType && <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-indigo-100/50">{col.semantic.businessType}</span>}{(col.semantic?.aliases || []).slice(0, 2).map((alias, idx) => <Badge key={idx} variant="secondary" className="bg-zinc-100 text-zinc-600 font-black border-none text-[9px] px-1.5 py-0 rounded-md">{alias}</Badge>)}</div>
                          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity"><div className="w-px h-4 bg-zinc-200 shrink-0" /><div className="flex items-center gap-1.5 truncate">{(col.sampleValues || []).slice(0, 3).map((val, i) => <span key={i} className="text-[10px] font-mono bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100/50 whitespace-nowrap text-zinc-600">{typeof val === 'object' ? '{...}' : String(val)}</span>)}{(col.sampleValues || []).length === 0 && <span className="text-[10px] italic text-zinc-400">no samples</span>}</div></div>
                        </div>
                        <div className="w-12 shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" onClick={() => handleOpenSemanticEdit(col)} className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="w-3.5 h-3.5" /></Button></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="mt-0 px-4 py-6 focus-visible:outline-none relative z-0">
            <div className="grid grid-cols-1 gap-4">
              {(currentFile.smartMetrics || []).map(metric => (
                <div key={metric.id} className="p-5 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group hover:border-zinc-300 transition-all">
                  <div className="flex items-center gap-4"><div className="p-3 bg-purple-50 rounded-xl text-purple-600"><Tag className="w-5 h-5" /></div><div><h4 className="text-sm font-bold text-zinc-900">{metric.name}</h4><code className="text-[10px] text-zinc-400 mt-1 block bg-zinc-50 px-1.5 py-0.5 rounded">{metric.sqlExpression}</code></div></div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" onClick={() => handleEditMetric(metric)} className="h-9 w-9 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => removeSmartMetric(currentFile.id, metric.id)} className="h-9 w-9 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button></div>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddMetric} className="h-20 border-dashed border-zinc-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/20 text-zinc-400 hover:text-indigo-600 transition-all flex flex-col gap-1"><Plus className="w-5 h-5" /><span className="text-xs font-bold uppercase tracking-widest">{t('add_metric')}</span></Button>
            </div>
          </TabsContent>

          <TabsContent value="relations" className="mt-0 px-4 py-6 focus-visible:outline-none relative z-0">
            <div className="grid grid-cols-1 gap-4">
              {(currentFile.relations || []).map(rel => (
                <div key={rel.id} className="p-5 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group hover:border-zinc-300 transition-all">
                  <div className="flex items-center gap-4"><div className="p-3 bg-pink-50 rounded-xl text-pink-600"><Link2 className="w-5 h-5" /></div><div><div className="flex items-center gap-2"><span className="text-sm font-bold text-zinc-900">{rel.sourceColumn}</span><ArrowRightLeft className="w-3 h-3 text-zinc-300" /><span className="text-sm font-bold text-zinc-900">{files.find(f => f.id === rel.targetFileId)?.name}.{rel.targetColumn}</span></div><p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-black">{rel.joinType || 'LEFT'}</p></div></div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" onClick={() => handleEditRelation(rel)} className="h-9 w-9 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteRelation(rel.id)} className="h-9 w-9 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button></div>
                </div>
              ))}
              <Button variant="outline" onClick={() => { setEditingRelation(undefined); setIsRelationModalOpen(true); }} className="h-20 border-dashed border-zinc-200 rounded-2xl hover:border-pink-300 hover:bg-pink-50/20 text-zinc-400 hover:text-pink-600 transition-all flex flex-col gap-1"><Plus className="w-5 h-5" /><span className="text-xs font-bold uppercase tracking-widest">{t('add_relationship')}</span></Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} onConfirm={handleDeleteFile} title={t('delete_file_confirm_title')} description={t('delete_file_confirm_desc')} variant="destructive" />
      <MetricEditorModal isOpen={isMetricModalOpen} onClose={() => setIsMetricModalOpen(false)} onSave={handleSaveMetric} initialMetric={editingMetric} file={currentFile} />
      <RelationEditorModal isOpen={isRelationModalOpen} onClose={() => setIsRelationModalOpen(false)} onSave={handleSaveRelation} initialRelation={editingRelation} sourceFile={currentFile} allFiles={files} />

      <Dialog open={!!editingColumn} onOpenChange={(open) => !open && setEditingColumn(null)}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl p-8 text-zinc-900">
          <DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-600" />{t('edit_semantic', 'Edit Semantic Info')}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3"><Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">{t('field_alias', 'Display Aliases / Synonyms')}</Label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">{editAliases.map((alias, idx) => (
                <Badge key={idx} variant="secondary" className="bg-indigo-50 text-indigo-600 font-bold px-2 py-1 gap-1 rounded-lg border-none group/tag">{alias}
                  <button onClick={() => handleRemoveAlias(alias)} className="text-indigo-300 hover:text-indigo-600 transition-colors"><Trash2 className="w-3 h-3" /></button>
                </Badge>))}
              </div>
              <div className="flex gap-2">
                <Input value={newAliasInput} onChange={(e) => setNewAliasInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAlias())} placeholder="New alias..." className="rounded-xl border-zinc-100 focus:ring-indigo-500 flex-1" />
                <Button variant="outline" onClick={handleAddAlias} className="rounded-xl border-zinc-100 text-zinc-400 hover:text-indigo-600"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Business Type</Label>
              <Select value={editBusinessType} onValueChange={setEditBusinessType}>
                <SelectTrigger className="rounded-xl border-zinc-100"><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">{BUSINESS_TYPES.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">{t('field_description', 'Business Description')}</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDescription(e.target.value)} placeholder="Describe the logic or meaning of this column..." className="rounded-xl border-zinc-100 min-h-[100px] focus:ring-indigo-500" />
            </div>
          </div>
          <DialogFooter className="gap-2"><Button variant="ghost" onClick={() => setEditingColumn(null)} className="rounded-xl font-bold">{t('cancel')}</Button><Button onClick={handleSaveSemantic} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 font-bold">{t('save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {gateNode}
    </div>
  )
}
