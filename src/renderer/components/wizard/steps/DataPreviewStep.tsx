import React, { useMemo, useEffect } from 'react'
import { useWizardStore } from '../../../stores/useWizardStore'
import { useProjectStore } from '../../../stores/useProjectStore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import {
  Key,
  ChevronLeft,
  ChevronRight,
  Link2,
  Edit2,
  Info,
  FileSearch,
  ArrowDownToLine,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { ColumnSchema, ColumnType } from '@shared/types'
import { useTranslation } from 'react-i18next'
import { Label } from '../../ui/label'
import { IngestionTask, ColumnConfig } from '@shared/types/wizard'
import { Input } from '../../ui/input'
import { formatForDisplay } from '@shared/serialization'
import { sanitizeTableName } from '@shared/naming-utils'
import { COLUMN_TYPE_CONFIG } from '@/src/lib/constants'

export function DataPreviewStep() {
  const {
    tasks,
    currentTaskIndex,
    updateColumnConfig,
    updateTask,
    nextTask,
    prevTask,
    mode,
    targetTableId,
    toggleMergeKey,
  } = useWizardStore()
  const { files } = useProjectStore()
  const { t } = useTranslation('common')

  const currentTask = tasks[currentTaskIndex]
  const targetFile = useMemo(() => {
    if (mode !== 'append' && mode !== 'merge') return null
    return files.find(f => f.id === targetTableId)
  }, [files, targetTableId, mode])

  // Initialize Mapping for Append/Merge Mode (Configuration only)
  useEffect(() => {
    if (
      (mode === 'append' || mode === 'merge') &&
      currentTask &&
      targetFile &&
      !currentTask.columnMapping
    ) {
      console.log(`[Wizard] Initializing auto-mapping for: ${targetFile.name}`)
      const initialMapping: Record<string, string | null> = {}
      const sourceCols = new Set(currentTask.columns.map(c => c.name))
      targetFile.columns.forEach(targetCol => {
        initialMapping[targetCol.name] = sourceCols.has(targetCol.name)
          ? targetCol.name
          : null
      })

      const updates: Partial<IngestionTask> = { columnMapping: initialMapping }

      // In Merge mode, default mergeKeys to PKs
      if (mode === 'merge' && !currentTask.mergeKeys) {
        updates.mergeKeys = targetFile.columns
          .filter(c => c.isPrimaryKey || c.isKey)
          .map(c => c.name)
      }

      updateTask(currentTaskIndex, updates)
    }
  }, [currentTask?.id, targetFile?.id, mode, updateTask, currentTaskIndex])

  if (!currentTask) return null

  const handleMappingChange = (source: string | null, target: string) => {
    console.log(
      `[Wizard] Mapping changed: Target[${target}] -> Source[${source || 'IGNORE'}]`
    )
    const newMapping = {
      ...(currentTask.columnMapping || {}),
      [target]: source,
    }
    updateTask(currentTaskIndex, { columnMapping: newMapping })
  }

  const handleTypeChange = (columnName: string, type: ColumnType) => {
    console.log(`[Wizard] Type changed: ${columnName} -> ${type}`)
    updateColumnConfig(currentTaskIndex, columnName, { type })
  }

  const handleTogglePK = (columnName: string, isPrimaryKey: boolean) => {
    console.log(`[Wizard] PK toggled: ${columnName} -> ${isPrimaryKey}`)
    updateColumnConfig(currentTaskIndex, columnName, { isPrimaryKey })
  }

  const hasMergeKeys = (currentTask.mergeKeys || []).length > 0
  const hasUpdateColumns = Object.entries(currentTask.columnMapping || {}).some(
    ([targetCol, sourceCol]) =>
      sourceCol !== null && !(currentTask.mergeKeys || []).includes(targetCol)
  )

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Header Info */}
      <div className="px-8 py-4 bg-zinc-100/50 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              {mode === 'append'
                ? t('wizard.mapping_fields', { name: targetFile?.name })
                : mode === 'merge'
                  ? t('wizard.mapping_fields_merge')
                  : t('wizard.configuring_asset')}
            </span>
            <span className="text-sm font-bold text-zinc-900 mt-1">
              {currentTask.sourceName}
            </span>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              {t('wizard.data_volume')}
            </span>
            <span className="text-sm font-bold text-zinc-900 mt-1">
              {t('wizard.preview_count', {
                count: currentTask.previewData.length,
                total: currentTask.rowCount.toLocaleString(),
              })}
            </span>
          </div>
        </div>

        {tasks.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={prevTask}
              disabled={currentTaskIndex === 0}
              className="p-1.5 rounded-md hover:bg-zinc-200 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextTask}
              disabled={currentTaskIndex === tasks.length - 1}
              className="p-1.5 rounded-md hover:bg-zinc-200 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mode-Specific Hints */}
      {mode === 'import' && (
        <div className="px-8 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-3">
          <FileSearch className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs text-indigo-900 font-medium">
            {t('wizard.import_hint_preview')}
          </span>
        </div>
      )}

      {(mode === 'append' || mode === 'replace') && (
        <div className="px-8 py-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-3">
          <ArrowDownToLine className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs text-emerald-800 font-medium">
            {t('wizard.append_hint_mapping')}
          </span>
        </div>
      )}

      {mode === 'merge' && (
        <div className="px-8 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
                  <Key className="w-3 h-3" /> {t('wizard.match_label')}
                </span>
                <span
                  className={cn(
                    'text-blue-900',
                    !hasMergeKeys && 'text-red-600 font-bold'
                  )}
                >
                  {hasMergeKeys
                    ? t('wizard.merge_hint_match')
                    : t('wizard.no_keys_selected')}
                </span>
              </div>
              <div className="w-px h-3 bg-blue-200" />
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">
                  <Edit2 className="w-3 h-3" /> {t('wizard.update_label')}
                </span>
                <span
                  className={cn(
                    'text-blue-900',
                    !hasUpdateColumns && 'text-red-600 font-bold'
                  )}
                >
                  {hasUpdateColumns
                    ? t('wizard.merge_hint_update')
                    : t('wizard.no_columns_to_update')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="overflow-x-auto">
          <Table className="min-w-full border-collapse">
            <TableHeader className="sticky top-0 z-20 bg-zinc-50 shadow-sm border-b">
              <TableRow>
                {(mode === 'append' || mode === 'merge') && targetFile
                  ? targetFile.columns.map(targetCol => (
                      <ColumnMappingHead
                        key={targetCol.name}
                        targetColumn={targetCol}
                        sourceColumns={currentTask.columns}
                        currentMapping={currentTask.columnMapping}
                        onMappingChange={handleMappingChange}
                        isMergeMode={mode === 'merge'}
                        isMergeKey={(currentTask.mergeKeys || []).includes(
                          targetCol.name
                        )}
                        onToggleMergeKey={() =>
                          toggleMergeKey(currentTaskIndex, targetCol.name)
                        }
                      />
                    ))
                  : currentTask.columns.map(col => (
                      <ColumnPreviewHead
                        key={col.name}
                        column={col}
                        onTogglePK={() =>
                          handleTogglePK(col.name, !col.isPrimaryKey)
                        }
                        onTypeChange={type =>
                          handleTypeChange(col.name, type as ColumnType)
                        }
                      />
                    ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTask.previewData.map((row, rowIdx) => (
                <TableRow key={rowIdx} className="hover:bg-zinc-50/50">
                  {((mode === 'append' || mode === 'merge') && targetFile
                    ? targetFile.columns
                    : currentTask.columns
                  ).map(col => {
                    const sourceColName =
                      mode === 'append' || mode === 'merge'
                        ? currentTask.columnMapping?.[col.name]
                        : col.name
                    const cellValue = sourceColName ? row[sourceColName] : null

                    return (
                      <TableCell
                        key={col.name}
                        className="px-4 py-2 text-xs text-zinc-600 border-r border-zinc-100 font-mono truncate max-w-[300px]"
                      >
                        {cellValue !== null && cellValue !== undefined ? (
                          formatForDisplay(cellValue, col.type)
                        ) : (
                          <span className="opacity-20 italic">
                            {t('no_data')}
                          </span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

const ColumnPreviewHead = ({
  column,
  onTogglePK,
  onTypeChange,
}: {
  column: any
  onTogglePK: () => void
  onTypeChange: (type: ColumnType) => void
}) => {
  const { t } = useTranslation('common')
  return (
    <TableHead className="px-4 py-3 border-b border-r border-zinc-200 min-w-[200px] max-w-[300px]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between group">
          <span
            className="text-xs font-bold text-zinc-900 truncate pr-2"
            title={column.name}
          >
            {column.name}
          </span>
          <button
            onClick={onTogglePK}
            className={cn(
              'p-1.5 rounded-lg border transition-all',
              column.isPrimaryKey
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-zinc-200 text-zinc-300 hover:text-indigo-600 hover:border-indigo-200'
            )}
            title={t('wizard.set_unique_key')}
          >
            <Key
              className={cn(
                'w-3.5 h-3.5',
                column.isPrimaryKey && 'fill-current'
              )}
            />
          </button>
        </div>
        <Select value={column.type} onValueChange={onTypeChange}>
          <SelectTrigger className="h-7 text-[10px] font-bold bg-white border-zinc-200 uppercase">
            {t(COLUMN_TYPE_CONFIG[column.type as ColumnType]?.label) || (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COLUMN_TYPE_CONFIG).map(([type, cfg]) => (
              <SelectItem key={type} value={type}>
                {t(cfg.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </TableHead>
  )
}

const ColumnMappingHead = ({
  targetColumn,
  sourceColumns,
  currentMapping,
  onMappingChange,
  isMergeMode,
  isMergeKey,
  onToggleMergeKey,
}: {
  targetColumn: ColumnSchema
  sourceColumns: ColumnConfig[]
  currentMapping: Record<string, string | null> | undefined
  onMappingChange: (source: string | null, target: string) => void
  isMergeMode?: boolean
  isMergeKey?: boolean
  onToggleMergeKey?: () => void
}) => {
  const { t } = useTranslation('common')
  const unmappedSourceCols = useMemo(() => {
    if (!sourceColumns) return []
    const mapped = new Set(Object.values(currentMapping || {}).filter(Boolean))
    const mappedSourceForThisTarget = currentMapping?.[targetColumn.name]

    return sourceColumns
      .filter(
        sc => !mapped.has(sc.name) || mappedSourceForThisTarget === sc.name
      )
      .map(c => c.name)
  }, [currentMapping, sourceColumns, targetColumn.name])

  const currentSourceMapping = currentMapping?.[targetColumn.name]

  // Merge Mode Visual Logic
  const isUpdateColumn = isMergeMode && !isMergeKey && currentSourceMapping

  return (
    <TableHead
      className={cn(
        'px-4 py-3 border-b border-r min-w-[240px] max-w-[300px] transition-colors relative group',
        isMergeKey
          ? 'bg-indigo-50/50 border-indigo-100'
          : isUpdateColumn
            ? 'bg-emerald-50/30 border-emerald-100'
            : 'border-zinc-200'
      )}
    >
      {/* Absolute Match Key Toggle */}
      {isMergeMode && (
        <button
          onClick={onToggleMergeKey}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-lg border transition-all z-30',
            isMergeKey
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
              : 'bg-white border-zinc-200 text-zinc-300 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm'
          )}
          title={
            isMergeKey ? t('wizard.unset_match_key') : t('wizard.set_match_key')
          }
        >
          <Key className={cn('w-3.5 h-3.5', isMergeKey && 'fill-current')} />
        </button>
      )}

      <div className="flex flex-col gap-2">
        {/* Header Row: Type Badge + Column Name */}
        <div className="flex items-start justify-between gap-2 pr-8">
          <div className="flex flex-col min-w-0 gap-1">
            {isMergeMode ? (
              <div className="flex items-center gap-2">
                {isMergeKey ? (
                  <span className="flex items-center gap-1 text-[10px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded shadow-sm">
                    {t('wizard.match_label')}
                  </span>
                ) : isUpdateColumn ? (
                  <span className="flex items-center gap-1 text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded shadow-sm">
                    {t('wizard.update_label')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                    {t('wizard.ignore')}
                  </span>
                )}
              </div>
            ) : (
              targetColumn.isPrimaryKey && (
                <div
                  title={t('wizard.set_unique_key')}
                  className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg border border-indigo-200 shrink-0"
                >
                  <Key className="w-3.5 h-3.5 fill-current" />
                </div>
              )
            )}
          </div>
          <span
            className={cn(
              'text-xs font-bold truncate',
              isMergeKey
                ? 'text-indigo-900'
                : isUpdateColumn
                  ? 'text-emerald-900'
                  : 'text-zinc-500'
            )}
            title={targetColumn.name}
          >
            {targetColumn.name}
          </span>
        </div>

        {/* Visual Label */}
        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-zinc-100" />
          <span className="text-[9px] font-mono text-zinc-300 tracking-tighter shrink-0 uppercase">
            {t('wizard.target_mapping')}
          </span>
          <div className="flex-1 h-px bg-zinc-100" />
        </div>

        {/* Source Selector */}
        <Select
          value={currentSourceMapping || ''}
          onValueChange={val =>
            onMappingChange(val === '' ? null : val, targetColumn.name)
          }
        >
          <SelectTrigger
            className={cn(
              'h-8 text-xs shadow-sm border-zinc-200 transition-all',
              !currentSourceMapping && 'text-zinc-400 bg-zinc-50 italic',
              isMergeKey &&
                'border-indigo-200 bg-white text-indigo-900 ring-2 ring-indigo-50',
              isUpdateColumn &&
                'border-emerald-200 bg-white text-emerald-900 ring-2 ring-emerald-50'
            )}
          >
            <SelectValue placeholder={t('wizard.map_to_target')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">({t('wizard.ignore_field')})</SelectItem>
            {unmappedSourceCols.map(sc => (
              <SelectItem key={sc} value={sc}>
                {sc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </TableHead>
  )
}
