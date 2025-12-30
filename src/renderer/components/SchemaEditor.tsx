import { useProjectStore } from '../stores/useProjectStore'
import { useSqlLabStore } from '../stores/useSqlLabStore'
import { useWizardStore } from '../stores/useWizardStore'
import {
  ColumnSchema,
  ColumnType,
  SmartMetric,
  TableRelation,
} from '@shared/types'
import { getUIFormatType, UIFormatType as FormatType } from '@shared/type-utils'
import {
  AlignJustify,
  Calculator,
  Calendar,
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
  Plus,
  Sparkles,
  ToggleLeft,
  Trash2,
  Type,
  Info,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToastStore } from '../stores/useToastStore'
import { useState } from 'react'
import { useProGate } from '@/hooks/use-pro-gate'
import { cn } from '@/utils/cn'
import { ExpandableAction } from './ui/expandable-action'
import { ConfirmDialog } from './modals/ConfirmDialog'
import { MetricEditorModal } from './modals/metric-editor-modal'
import { RelationEditorModal } from './modals/RelationEditorModal'
import { COLUMN_TYPE_CONFIG } from '@/src/lib/constants'

export function SchemaEditor() {
  const files = useProjectStore(s => s.files)
  const activeFileId = useProjectStore(s => s.activeFileId)
  const toggleKeyColumn = useProjectStore(s => s.toggleKeyColumn)
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

  // 确保有选中的文件
  const currentFileId =
    activeFileId && files.find(f => f.id === activeFileId)
      ? activeFileId
      : files[0]?.id

  const currentFile = files.find(f => f.id === currentFileId)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Metric State
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState<SmartMetric | undefined>(
    undefined
  )

  // Relation State
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false)
  const [editingRelation, setEditingRelation] = useState<
    TableRelation | undefined
  >(undefined)

  if (!currentFile) return null

  // --- Handlers ---
  const handleAppend = () => {
    checkGate(t('append_data', 'Append'), () => {
      openWizard('append', currentFile.id)
    })
  }

  const handleAddMetric = () => {
    checkGate(tAnalysis('smart_metric.add_button'), () => {
      setEditingMetric(undefined)
      setIsMetricModalOpen(true)
    })
  }

  const handleReplace = async () => {
    openWizard('replace', currentFile.id)
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

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto min-h-0 relative bg-white pb-32">
        <div className="flex flex-col min-h-0">
          {/* Header */}
          <div className="flex flex-col gap-3 px-8 py-5 border-b border-zinc-100 bg-white shrink-0">
            {/* Top Row: Title & Actions */}
            <div className="flex items-start justify-between gap-4">
              {/* Title Section */}
              <div className="flex items-center gap-3 min-w-0 pt-0.5">
                <div className="p-2 bg-green-50 rounded-xl border border-green-100 shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight truncate">
                  {currentFile.name}
                </h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-zinc-300 hover:text-zinc-500 transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs break-words">
                      <div className="space-y-1.5 p-1 text-xs">
                        <div className="font-bold">Source Info</div>
                        <div>
                          <div className="text-zinc-400">Path</div>
                          <div className="font-mono">{currentFile.path}</div>
                        </div>
                        {currentFile.sheetName && (
                          <div>
                            <div className="text-zinc-400">Sheet</div>
                            <div className="font-mono">
                              {currentFile.sheetName}
                            </div>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Actions Toolbar */}
              <div className="flex items-center gap-1 p-1 bg-white border border-zinc-200/60 rounded-2xl shadow-sm shrink-0">
                {currentFile.status === 'ready' && (
                  <>
                    {/* Group: Build */}
                    <div className="flex items-center gap-1 pr-1 border-r border-zinc-100">
                      <ExpandableAction
                        icon={
                          <Calculator className="w-4 h-4 text-purple-600" />
                        }
                        label={tAnalysis('smart_metric.add_button')}
                        onClick={handleAddMetric}
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
                    </div>

                    {/* Group: Data */}
                    <div className="flex items-center gap-1 px-1 border-r border-zinc-100">
                      <ExpandableAction
                        icon={<Plus className="w-4 h-4 text-emerald-600" />}
                        label={t('append_data', 'Append')}
                        onClick={handleAppend}
                        className="hover:bg-emerald-50 hover:border-emerald-200"
                      />
                      <ExpandableAction
                        icon={<FileInput className="w-4 h-4 text-amber-600" />}
                        label={t('replace_source')}
                        onClick={handleReplace}
                        className="hover:bg-amber-50 hover:border-amber-200"
                      />
                    </div>
                  </>
                )}

                {/* Group: Danger */}
                <div className="flex items-center gap-1 pl-1">
                  <ExpandableAction
                    icon={<Trash2 className="w-4 h-4 text-red-500" />}
                    label={t('remove_file')}
                    onClick={handleDelete}
                    className="hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Row: Metadata */}
            <div className="flex items-center flex-wrap gap-4 text-sm text-zinc-500 pl-1">
              <div
                className="flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                title="SQL Table Name"
              >
                <Database className="w-4 h-4 text-zinc-400" />
                <span className="font-mono text-xs bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg text-zinc-600 select-all">
                  {currentFile.tableName}
                </span>
              </div>

              <div className="w-px h-3 bg-zinc-200 shrink-0" />

              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <AlignJustify className="w-4 h-4 text-zinc-400" />
                <span className="font-medium">
                  {currentFile.rowCount?.toLocaleString() ?? 0} {t('rows')}
                </span>
                <span className="text-zinc-300">·</span>
                <span className="font-medium">
                  {currentFile.columns.length} {t('field_name')}
                </span>
              </div>

              <div className="w-px h-3 bg-zinc-200 shrink-0" />

              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-xs">
                  {t('last_updated')}:{' '}
                  {new Date(currentFile.lastModified).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Table Content */}
          {currentFile.status === 'ready' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-30 bg-white shadow-sm">
                <tr className="text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-white">
                  <th className="px-6 py-3 w-1/3 border-b">
                    {t('field_name')}
                  </th>
                  <th className="px-6 py-3 w-1/4 border-b">{t('format')}</th>
                  <th className="px-6 py-3 border-b">{t('preview')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {/* Smart Metrics */}
                {currentFile.smartMetrics &&
                  currentFile.smartMetrics.length > 0 && (
                    <>
                      <SectionHeader
                        icon={<Sparkles className="w-3 h-3 text-purple-400" />}
                        title={tAnalysis('smart_metric.section_title')}
                      />
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
                    <SectionHeader
                      icon={<Link2 className="w-3 h-3 text-indigo-400" />}
                      title={t('relationships_root')}
                    />
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
                <SectionHeader
                  icon={<Database className="w-3 h-3" />}
                  title={tAnalysis('smart_metric.physical_columns')}
                />
                {currentFile.columns.map(col => (
                  <ColumnRow
                    key={col.name}
                    fileId={currentFile.id}
                    column={col}
                    onToggleKey={() =>
                      toggleKeyColumn(currentFile.id, col.name)
                    }
                    isLinked={
                      (currentFile.relations || []).some(
                        r => r.sourceColumn === col.name
                      ) ||
                      files.some(f =>
                        (f.relations || []).some(
                          r =>
                            r.targetFileId === currentFile.id &&
                            r.targetColumn === col.name
                        )
                      )
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
      {gateNode}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode
  title: string
}) {
  return (
    <tr className="bg-zinc-50/80 border-y border-zinc-100">
      <td
        colSpan={3}
        className="px-4 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider"
      >
        <div className="flex items-center gap-2">
          {icon} {title}
        </div>
      </td>
    </tr>
  )
}

function SmartMetricRow({
  metric,
  onEdit,
  onDelete,
}: {
  metric: SmartMetric
  onEdit: () => void
  onDelete: () => void
}) {
  const standardizedType = metric.type || 'DOUBLE'
  let badgeConfig = {
    color: 'bg-zinc-50 text-zinc-500 border-zinc-200',
    icon: HelpCircle,
    label: '?',
  }

  switch (standardizedType) {
    case 'INTEGER':
    case 'DOUBLE':
      badgeConfig = {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Hash,
        label: 'NUM',
      }
      break
    case 'VARCHAR':
      badgeConfig = {
        color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        icon: Type,
        label: 'TEXT',
      }
      break
    case 'DATE':
    case 'TIMESTAMP':
      badgeConfig = {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: Calendar,
        label: 'DATE',
      }
      break
    case 'BOOLEAN':
      badgeConfig = {
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: ToggleLeft,
        label: 'BOOL',
      }
      break
  }

  return (
    <tr className="hover:bg-purple-50/50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-purple-100 rounded text-purple-600">
            <Calculator className="w-3 h-3" />
          </div>
          <span className="text-sm font-medium text-zinc-900">
            {metric.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border',
            badgeConfig.color
          )}
        >
          <badgeConfig.icon className="w-3 h-3" /> {badgeConfig.label}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-between group/row">
          <code
            className="text-xs font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-600 truncate max-w-[250px]"
            title={metric.sqlExpression}
          >
            {metric.sqlExpression}
          </code>
          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onEdit}
            >
              <Edit2 className="w-3 h-3 text-zinc-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-red-600 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </td>
    </tr>
  )
}

function RelationRow({
  relation,
  targetName,
  onEdit,
  onDelete,
}: {
  relation: TableRelation
  targetName: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <tr className="hover:bg-indigo-50/30 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-indigo-100 rounded text-indigo-600">
            <Link2 className="w-3 h-3" />
          </div>
          <span className="text-sm text-zinc-600 truncate">{targetName}</span>
        </div>
      </td>
      <td colSpan={2} className="px-4 py-3">
        <div className="flex items-center justify-between group/row">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <code
              className="text-[11px] font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-600 truncate max-w-[150px]"
              title={relation.sourceColumn}
            >
              {relation.sourceColumn}
            </code>
            <span className="text-zinc-400 text-[10px] font-bold">=</span>
            <code
              className="text-[11px] font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-600 truncate max-w-[150px]"
              title={relation.targetColumn}
            >
              {relation.targetColumn}
            </code>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onEdit}
            >
              <Edit2 className="w-3 h-3 text-zinc-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-red-600 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </td>
    </tr>
  )
}

function ColumnRow({
  fileId,
  column,
  onToggleKey,
  isLinked,
}: {
  fileId: string
  column: ColumnSchema
  onToggleKey: () => void
  isLinked: boolean
}) {
  const config = COLUMN_TYPE_CONFIG[column.type]
  const IconComponent = config.icon
  const { t } = useTranslation('common')

  return (
    <tr className="hover:bg-zinc-50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleKey}
            className={`mr-1 cursor-pointer transition-colors p-1 rounded hover:bg-zinc-100 flex items-center justify-center ${column.isKey ? 'text-indigo-500' : 'text-zinc-300'}`}
            title={column.isKey ? t('unset_key') : t('set_key')}
          >
            <Key className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0 group/name">
            <span
              className={cn(
                'text-sm truncate',
                column.alias ? 'text-zinc-900 font-medium' : 'text-zinc-600'
              )}
            >
              {column.alias || column.name}
            </span>
            {column.alias && (
              <span className="text-[10px] text-zinc-400 font-mono">
                ({column.name})
              </span>
            )}
          </div>
          {isLinked && (
            <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              <Link2 className="w-3 h-3" />
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded whitespace-nowrap cursor-default opacity-80',
            config.bgColor,
            config.textColor
          )}
        >
          <IconComponent className="w-3.5 h-3.5" /> {t(config.label)}
        </span>
      </td>
      <td className="px-4 py-3">
        {Array.isArray(column.sampleValues) &&
        column.sampleValues.length > 0 ? (
          <div className="flex gap-1 flex-wrap text-xs text-muted-foreground">
            {column.sampleValues.map((val, i) => (
              <span
                key={i}
                className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] border text-zinc-600 max-w-[120px] truncate inline-block align-middle"
                title={String(val)}
              >
                {String(val)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground text-zinc-400 opacity-30 italic">
            {t('no_preview')}
          </span>
        )}
      </td>
    </tr>
  )
}
