import { useProjectStore } from '../stores/useProjectStore'
import { useSqlLabStore } from '../stores/useSqlLabStore'
import { ColumnSchema, ColumnType, SmartMetric, TableRelation } from '@shared/types'
import { getUIFormatType, UIFormatType as FormatType } from '@shared/type-utils'
import {
  AlignJustify,
  Calculator,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Database,
  Edit2,
  FileInput,
  FileSpreadsheet,
  Hash,
  HelpCircle,
  Key,
  Link2,
  RefreshCw,
  Sparkles,
  ToggleLeft,
  Trash2,
  Type,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToastStore } from '../stores/useToastStore'
import { useReIngestFile } from '../hooks/useIPC'
import { useState } from 'react'
import { Input } from './ui/input'
import { cn } from '@/utils/cn'
import { ExpandableAction } from './ui/expandable-action'
import { ConfirmDialog } from './modals/ConfirmDialog'
import { MetricEditorModal } from './modals/metric-editor-modal'
import { RelationEditorModal } from './modals/RelationEditorModal'

interface FormatConfig {
  label: string
  icon: typeof Hash
  bgColor: string
  textColor: string
}

const FORMAT_CONFIG: Record<FormatType, FormatConfig> = {
  number: {
    label: 'format_number',
    icon: Hash,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  text: {
    label: 'format_text',
    icon: Type,
    bgColor: 'bg-zinc-100',
    textColor: 'text-zinc-600',
  },
  date: {
    label: 'format_date',
    icon: Calendar,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  timestamp: {
    label: 'format_datetime',
    icon: Clock,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
}

export function SchemaEditor() {
  const files = useProjectStore(s => s.files)
  const activeFileId = useProjectStore(s => s.activeFileId)
  const toggleKeyColumn = useProjectStore(s => s.toggleKeyColumn)
  const openSqlLab = useSqlLabStore(s => s.open)
  const replaceFile = useProjectStore(s => s.replaceFile)
  const removeFile = useProjectStore(s => s.removeFile)
  const addSmartMetric = useProjectStore(s => s.addSmartMetric)
  const removeSmartMetric = useProjectStore(s => s.removeSmartMetric)
  const addRelation = useProjectStore(s => s.addRelation)
  const removeRelation = useProjectStore(s => s.removeRelation)
  
  const { t } = useTranslation('common')
  const { t: tAnalysis } = useTranslation('analysis')
  const toast = useToastStore()
  const reIngest = useReIngestFile()

  // 确保有选中的文件
  const currentFileId =
    activeFileId && files.find(f => f.id === activeFileId)
      ? activeFileId
      : files[0]?.id

  const currentFile = files.find(f => f.id === currentFileId)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Metric State
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<SmartMetric | undefined>(undefined)

  // Relation State
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false)
  const [editingRelation, setEditingRelation] = useState<TableRelation | undefined>(undefined)

  if (!currentFile) return null

  // Compute Active Links (Outbound)
  const activeLinks = currentFile.relations || []

  // --- Handlers ---
  const handleReload = async () => {
    await toast.promise(
      async () => {
        const result = await reIngest.mutateAsync({
          fileId: currentFile.id,
          filePath: currentFile.path,
          tableName: currentFile.tableName,
          sheetName: currentFile.sheetName,
        })
        useProjectStore.getState().reloadFile(currentFile.id, result)
      },
      {
        loading: t('reloading'),
        success: t('reload_success'),
        error: e => `${t('reload_failed')}: ${String(e)}`,
      }
    )
  }

  const handleReplace = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.selectFile()
    if (result.success && result.data) {
      await toast.promise(
        async () => {
          const status = await replaceFile(currentFile.id, result.data)
          if (status !== 'completed') {
            throw new Error(t('replace_failed'))
          }
        },
        {
          loading: t('replacing_file'),
          success: t('file_replaced'),
          error: e => `${t('replace_failed')}: ${String(e)}`,
        }
      )
    }
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    removeFile(currentFile.id)
    toast.addToast({
      title: t('file_removed'),
      type: 'success',
      duration: 2000,
    })
  }

  // --- Metric Handlers ---
  const handleSaveMetric = async (metric: SmartMetric) => {
    if (editingMetric) {
      await removeSmartMetric(currentFile.id, editingMetric.id)
    }
    await addSmartMetric(currentFile.id, metric)
    toast.addToast({
      title: editingMetric
        ? tAnalysis('smart_metric.toast_updated')
        : tAnalysis('smart_metric.toast_added'),
      type: 'success',
      duration: 2000,
    })
  }

  const handleEditMetric = (metric: SmartMetric) => {
    setEditingMetric(metric)
    setIsMetricModalOpen(true)
  }

  const handleDeleteMetric = async (metricId: string) => {
    await removeSmartMetric(currentFile.id, metricId)
    toast.addToast({
      title: tAnalysis('smart_metric.toast_removed'),
      type: 'success',
      duration: 2000,
    })
  }

  // --- Relation Handlers ---
  const handleSaveRelation = async (relation: TableRelation) => {
    if (editingRelation) {
      await removeRelation(editingRelation.id)
    }
    await addRelation({
      ...relation,
      sourceFileId: currentFile.id
    })
    toast.addToast({
      title: editingRelation ? t('relationship_updated', 'Relation Updated') : t('relationship_added', 'Relation Added'),
      type: 'success',
      duration: 2000
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
      duration: 2000
    })
  }

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto min-h-0 relative bg-white pb-32">
        <div className="flex flex-col min-h-0">
          {/* Header */}
          <div className="px-8 py-6 border-b border-zinc-100 bg-white shrink-0 relative">
            <div className="flex flex-col gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-green-50 rounded-lg border border-green-100 shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight truncate whitespace-nowrap">
                  {currentFile.name}
                </h2>
              </div>

              <div className="flex items-center flex-wrap gap-4 text-sm text-zinc-500 pl-1">
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap" title="SQL Table Name">
                  <Database className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-mono text-xs bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-700 select-all">
                    {currentFile.tableName}
                  </span>
                </div>

                                  <div className="w-px h-3 bg-zinc-200 shrink-0" />

                

                                  {/* Stats */}

                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <AlignJustify className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    {currentFile.rowCount?.toLocaleString() ?? 0} {t('rows')}
                  </span>
                  <span>·</span>
                  <span>
                    {currentFile.columns.length} {t('field_name')}
                  </span>
                </div>

                <div className="w-px h-3 bg-zinc-200 shrink-0" />

                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-xs">
                    {t('last_updated')}: {new Date(currentFile.lastModified).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute top-6 right-4 flex items-center gap-2 p-1 bg-white/80 backdrop-blur border border-zinc-200 rounded-lg shadow-sm hover:shadow transition-shadow">
              {currentFile.status === 'ready' && (
                <>
                  <ExpandableAction
                    icon={<Calculator className="w-4 h-4 text-purple-600" />}
                    label={tAnalysis('smart_metric.add_button')}
                    onClick={() => {
                      setEditingMetric(undefined)
                      setIsMetricModalOpen(true)
                    }}
                    className="hover:bg-purple-50 hover:border-purple-200"
                  />

                  <ExpandableAction
                    icon={<Link2 className="w-4 h-4 text-indigo-600" />}
                    label={t('add_new_link')}
                    onClick={() => {
                      setEditingRelation(undefined)
                      setIsRelationModalOpen(true)
                    }}
                    className="hover:bg-indigo-50 hover:border-indigo-200"
                  />

                  <ExpandableAction
                    icon={<RefreshCw className="w-4 h-4" />}
                    label={t('reload_data')}
                    onClick={handleReload}
                  />

                  <ExpandableAction
                    icon={<FileInput className="w-4 h-4" />}
                    label={t('replace_source')}
                    onClick={handleReplace}
                  />
                </>
              )}

              <ExpandableAction
                icon={<Trash2 className="w-4 h-4" />}
                label={t('remove_file')}
                onClick={handleDelete}
                className="hover:text-red-600 hover:bg-red-50"
              />
            </div>
          </div>

          {/* Table Content */}
          {currentFile.status === 'ready' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-30 bg-white shadow-sm">
                <tr className="text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-white">
                  <th className="px-6 py-3 w-1/3 border-b">{t('field_name')}</th>
                  <th className="px-6 py-3 w-1/4 border-b">{t('format')}</th>
                  <th className="px-6 py-3 border-b">{t('preview')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {/* Smart Metrics */}
                {currentFile.smartMetrics && currentFile.smartMetrics.length > 0 && (
                  <>
                    <SectionHeader icon={<Sparkles className="w-3 h-3 text-purple-400" />} title={tAnalysis('smart_metric.section_title')} />
                    {currentFile.smartMetrics.map(metric => (
                      <SmartMetricRow
                        key={metric.id}
                        metric={metric}
                        onEdit={() => handleEditMetric(metric)}
                        onDelete={() => handleDeleteMetric(metric.id)}
                      />
                    ))}
                  </>
                )}

                {/* Relationships */}
                {currentFile.relations && currentFile.relations.length > 0 && (
                  <>
                    <SectionHeader icon={<Link2 className="w-3 h-3 text-indigo-400" />} title={t('relationships_root')} />
                    {currentFile.relations.map(rel => {
                      const target = files.find(f => f.id === rel.targetFileId)
                      return (
                        <RelationRow
                          key={rel.id}
                          relation={rel}
                          targetName={target?.name || 'Unknown'}
                          onEdit={() => handleEditRelation(rel)}
                          onDelete={() => handleDeleteRelation(rel.id)}
                        />
                      )
                    })}
                  </>
                )}

                {/* Physical Columns */}
                <SectionHeader icon={<Database className="w-3 h-3" />} title={tAnalysis('smart_metric.physical_columns')} />
                {currentFile.columns.map(col => (
                  <ColumnRow
                    key={col.name}
                    fileId={currentFile.id}
                    column={col}
                    onToggleKey={() => toggleKeyColumn(currentFile.id, col.name)}
                    isLinked={
                      (currentFile.relations || []).some(r => r.sourceColumn === col.name) ||
                      files.some(f => (f.relations || []).some(r => r.targetFileId === currentFile.id && r.targetColumn === col.name))
                    }
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('remove_file')}
        description={t('delete_session_desc')}
        onConfirm={confirmDelete}
        variant="destructive"
        confirmText={t('remove_file')}
        cancelText={t('cancel')}
      />

      {currentFile && (
        <>
          <MetricEditorModal
            isOpen={isMetricModalOpen}
            onClose={() => setIsMetricModalOpen(false)}
            file={currentFile}
            initialMetric={editingMetric}
            onSave={handleSaveMetric}
          />
          <RelationEditorModal
            isOpen={isRelationModalOpen}
            onClose={() => setIsRelationModalOpen(false)}
            sourceFile={currentFile}
            allFiles={files}
            initialRelation={editingRelation}
            onSave={handleSaveRelation}
          />
        </>
      )}
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <tr className="bg-zinc-50/80 border-y border-zinc-100">
      <td colSpan={3} className="px-4 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          {icon} {title}
        </div>
      </td>
    </tr>
  )
}

function SmartMetricRow({ metric, onEdit, onDelete }: { metric: SmartMetric, onEdit: () => void, onDelete: () => void }) {
  const standardizedType = metric.type || 'DOUBLE'
  let badgeConfig = { color: 'bg-zinc-50 text-zinc-500 border-zinc-200', icon: HelpCircle, label: '?' }

  switch (standardizedType) {
    case 'INTEGER': case 'DOUBLE':
      badgeConfig = { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Hash, label: 'NUM' }; break
    case 'VARCHAR':
      badgeConfig = { color: 'bg-zinc-100 text-zinc-700 border-zinc-200', icon: Type, label: 'TEXT' }; break
    case 'DATE': case 'TIMESTAMP':
      badgeConfig = { color: 'bg-green-50 text-green-700 border-green-200', icon: Calendar, label: 'DATE' }; break
    case 'BOOLEAN':
      badgeConfig = { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: ToggleLeft, label: 'BOOL' }; break
  }

  return (
    <tr className="hover:bg-purple-50/50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-purple-100 rounded text-purple-600">
            <Calculator className="w-3 h-3" />
          </div>
          <span className="text-sm font-medium text-zinc-900">{metric.name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border', badgeConfig.color)}>
          <badgeConfig.icon className="w-3 h-3" /> {badgeConfig.label}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-between group/row">
          <code className="text-xs font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-600 truncate max-w-[200px]">
            {metric.sqlExpression}
          </code>
          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Edit2 className="w-3 h-3 text-zinc-400" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-600 hover:bg-red-50" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      </td>
    </tr>
  )
}

function RelationRow({ relation, targetName, onEdit, onDelete }: { relation: TableRelation, targetName: string, onEdit: () => void, onDelete: () => void }) {
  return (
    <tr className="hover:bg-indigo-50/30 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-indigo-100 rounded text-indigo-600"><Link2 className="w-3 h-3" /></div>
          <span className="text-sm font-medium text-zinc-900 truncate">{targetName}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">
          {relation.joinType || 'LEFT'} JOIN
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-between group/row">
          <div className="flex items-center gap-1.5">
            <code className="text-[11px] font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-600">{relation.sourceColumn}</code>
            <span className="text-zinc-400 text-[10px] font-bold">=</span>
            <code className="text-[11px] font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-600">{relation.targetColumn}</code>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Edit2 className="w-3 h-3 text-zinc-400" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-600 hover:bg-red-50" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      </td>
    </tr>
  )
}

function ColumnRow({ fileId, column, onToggleKey, isLinked }: { fileId: string, column: ColumnSchema, onToggleKey: () => void, isLinked: boolean }) {
  const formatType = getUIFormatType(column.type)
  const config = FORMAT_CONFIG[formatType]
  const IconComponent = config.icon
  const { t } = useTranslation('common')
  const updateColumn = useProjectStore(s => s.updateColumn)
  const [isRenaming, setIsRenaming] = useState(false)
  const [alias, setAlias] = useState(column.alias || column.name)

  const submitRename = () => {
    if (alias.trim() && alias !== (column.alias || column.name)) {
      updateColumn(fileId, column.name, { alias: alias.trim() })
    }
    setIsRenaming(false)
  }

  const handleTypeChange = (newType: string) => {
    updateColumn(fileId, column.name, { type: newType as ColumnType })
  }

  return (
    <tr className="hover:bg-zinc-50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onToggleKey} className={`mr-1 cursor-pointer transition-colors p-1 rounded hover:bg-zinc-100 flex items-center justify-center ${column.isKey ? 'text-indigo-500' : 'text-zinc-300'}`} title={column.isKey ? t('unset_key') : t('set_key')}>
            <Key className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0 group/name">
            {isRenaming ? (
              <div className="flex items-center gap-1 flex-1">
                <Input autoFocus value={alias} onChange={e => setAlias(e.target.value)} onBlur={submitRename} onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setAlias(column.alias || column.name); setIsRenaming(false); } }} className="h-7 text-sm py-0 px-2" />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 shrink-0" onClick={submitRename}><Check className="w-4 h-4" /></Button>
              </div>
            ) : (
              <>
                <span className={cn('text-sm truncate', column.alias ? 'text-zinc-900 font-medium' : 'text-zinc-600')}>{column.alias || column.name}</span>
                {column.alias && <span className="text-[10px] text-zinc-400 font-mono">({column.name})</span>}
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" onClick={() => setIsRenaming(true)}><Edit2 className="w-3 h-3 text-zinc-400" /></Button>
              </>
            )}
          </div>
          {isLinked && <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded"><Link2 className="w-3 h-3" /></span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity', config.bgColor, config.textColor)}>
              <IconComponent className="w-3.5 h-3.5" /> {t(config.label)} <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            <DropdownMenuItem onClick={() => handleTypeChange('VARCHAR')}><Type className="w-4 h-4 mr-2" /> {t('format_text')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('DOUBLE')}><Hash className="w-4 h-4 mr-2" /> {t('format_number')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('DATE')}><Calendar className="w-4 h-4 mr-2" /> {t('format_date')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('TIMESTAMP')}><Clock className="w-4 h-4 mr-2" /> {t('format_datetime')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('BOOLEAN')}><ToggleLeft className="w-4 h-4 mr-2" /> {t('type_boolean')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-4 py-3">
        {Array.isArray(column.sampleValues) && column.sampleValues.length > 0 ? (
          <div className="flex gap-1 flex-wrap text-xs text-muted-foreground">
            {column.sampleValues.map((val, i) => <span key={i} className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] border text-zinc-600 max-w-[120px] truncate inline-block align-middle" title={String(val)}>{String(val)}</span>)}
          </div>
        ) : <span className="text-xs text-muted-foreground text-zinc-400 opacity-30 italic">{t('no_preview')}</span>}
      </td>
    </tr>
  )
}