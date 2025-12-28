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
import { Key, ChevronLeft, ChevronRight, Link2 } from 'lucide-react'
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
  } = useWizardStore()
  const { files } = useProjectStore()
  const { t } = useTranslation('common')

  const currentTask = tasks[currentTaskIndex]
  const targetFile = useMemo(() => {
    if (mode !== 'append') return null
    return files.find(f => f.id === targetTableId)
  }, [files, targetTableId, mode])

  // Initialize Mapping for Append Mode (Configuration only)
  useEffect(() => {
    if (
      mode === 'append' &&
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
      updateTask(currentTaskIndex, { columnMapping: initialMapping })
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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Header Info */}
      <div className="px-8 py-4 bg-zinc-100/50 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              {mode === 'append'
                ? t('wizard.mapping_fields', { name: targetFile?.name })
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="overflow-x-auto">
          <Table className="min-w-full border-collapse">
            <TableHeader className="sticky top-0 z-20 bg-zinc-50 shadow-sm border-b">
              <TableRow>
                {mode === 'append' && targetFile
                  ? targetFile.columns.map(targetCol => (
                      <ColumnMappingHead
                        key={targetCol.name}
                        targetColumn={targetCol}
                        sourceColumns={currentTask.columns}
                        currentMapping={currentTask.columnMapping}
                        onMappingChange={handleMappingChange}
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
                  {(mode === 'append' && targetFile
                    ? targetFile.columns
                    : currentTask.columns
                  ).map(col => {
                    const sourceColName =
                      mode === 'append'
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
              'p-1 rounded transition-colors',
              column.isPrimaryKey
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100'
            )}
            title={t('wizard.set_unique_key')}
          >
            <Key className="w-3.5 h-3.5" />
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
}: {
  targetColumn: ColumnSchema
  sourceColumns: ColumnConfig[]
  currentMapping: Record<string, string | null> | undefined
  onMappingChange: (source: string | null, target: string) => void
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

  return (
    <TableHead className="px-4 py-3 border-b border-r border-zinc-200 min-w-[240px] max-w-[300px]">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {targetColumn.isPrimaryKey && (
            <div title={t('wizard.set_unique_key')}>
              <Key className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          )}
          <span
            className="text-xs font-bold text-zinc-900 truncate"
            title={targetColumn.name}
          >
            {targetColumn.name}
          </span>
          <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-bold border border-zinc-200">
            {t('wizard.target_label')}
          </span>
        </div>

        <div className="flex items-center justify-center h-5">
          <Link2 className="w-4 h-4 text-indigo-300" />
        </div>

        <Select
          value={currentSourceMapping || ''}
          onValueChange={val =>
            onMappingChange(val === '' ? null : val, targetColumn.name)
          }
        >
          <SelectTrigger
            className={cn(
              'h-8 text-xs bg-white',
              !currentSourceMapping && 'text-zinc-400'
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
