import React, { useState, useEffect } from 'react'
import { useWizardStore } from '@/stores/useWizardStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { Button } from '../../ui/button'
import {
  FileSpreadsheet,
  Loader2,
  Upload,
  FileText,
  Check,
  AlertCircle,
  Database,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { IngestionTask, ColumnConfig } from '@shared/types/wizard'
import { ColumnSchema } from '@shared/types'
import { sanitizeTableName } from '@shared/naming-utils'

import { useSettingsStore } from '@/stores/useSettingsStore'
import { useProGate } from '@/hooks/use-pro-gate'

const TRIAL_FILE_LIMIT = 3

export function FileSelectionStep() {
  const { selectedFiles, setFiles, tasks, setTasks, mode, targetTableId } =
    useWizardStore()
  const { files: projectFiles } = useProjectStore()
  const { isActivated } = useSettingsStore()
  const { checkGate, gateNode } = useProGate()
  const { t } = useTranslation('common')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parseProgress, setParseProgress] = useState<{
    path: string
    count?: number
    isPercentage?: boolean
    progress?: number
  } | null>(null)

  const handleSelectFiles = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.selectFiles()

    if (result.success && result.data && result.data.length > 0) {
      // Map result to include 'name' derived from path
      const filesWithNames = result.data.map(f => ({
        ...f,
        name: f.path.split(/[\\/]/).pop() || 'unknown',
      }))
      setFiles(filesWithNames)
    }
  }

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [allTasks, setAllTasks] = useState<IngestionTask[]>([])

  useEffect(() => {
    const unsub = window.electronAPI?.onParseProgress(data => {
      setParseProgress(data as any)
    })
    return () => {
      unsub && unsub()
    }
  }, [])

  // Effect: When files change, parse them to get sheets/tasks
  useEffect(() => {
    if (selectedFiles.length === 0) return

    const parseFiles = async () => {
      setIsParsing(true)
      setError(null)
      setParseProgress(null)
      const newTasks: IngestionTask[] = []

      try {
        for (const file of selectedFiles) {
          const res = await window.electronAPI.parseFile(file.path)
          if (!res.success) {
            throw new Error(res.error || 'Failed to parse file')
          }
          if (res.data) {
            const results = Array.isArray(res.data) ? res.data : [res.data]

            // Use Promise.all to handle async tableName generation
            const taskPromises = results.map(async (item: any) => {
              // For append mode, inherit PK/Key from target table
              const targetFile =
                mode === 'append'
                  ? projectFiles.find(f => f.id === targetTableId)
                  : null

              const columns: ColumnConfig[] = item.schema.columns.map(
                (c: ColumnSchema) => {
                  const targetCol = targetFile?.columns.find(
                    tc => tc.name === c.name
                  )
                  return {
                    name: c.name,
                    type: c.type,
                    isPrimaryKey: targetCol
                      ? !!targetCol.isPrimaryKey || !!targetCol.isKey
                      : false,
                  }
                }
              )

              const sourceName = item.sheetName || item.tableName || file.name
              let defaultTableName = item.tableName

              if (mode === 'import') {
                // Pass raw names to backend to handle sanitization and unique check
                const res = await window.electronAPI.getUniqueTableName(
                  file.name,
                  item.sheetName
                )
                if (res.success) defaultTableName = res.data
              }

              const displayName =
                item.sheetName && item.sheetName !== file.name
                  ? `${file.name.replace(/\.xlsx?$/, '')} - ${item.sheetName}`
                  : item.sheetName || file.name.replace(/\.xlsx?$/, '')

              return {
                id: crypto.randomUUID(),
                sourceName: sourceName,
                fileName: file.name,
                filePath: file.path,
                tableName: item.tableName, // This is empty/temp from parseFile
                finalTableName: defaultTableName,
                finalDisplayName: displayName,
                columns,
                previewData: item.preview || [],
                rowCount: item.rowCount || 0,
                mode: mode,
                status: 'pending',
                tempFilePath: item.schema?.tempFilePath, // Correctly access nested property
              } as IngestionTask
            })

            const fileTasks = await Promise.all(taskPromises)
            newTasks.push(...fileTasks)
          }
        }

        setAllTasks(newTasks) // Store locally

        if (mode === 'append' || mode === 'replace') {
          // Default to first, but allow switching
          if (newTasks.length > 0) {
            let defaultTask = newTasks[0]
            
            // For replace mode, try to match the original sheet name
            if (mode === 'replace' && targetTableId) {
              const originalFile = projectFiles.find(f => f.id === targetTableId)
              if (originalFile?.sheetName) {
                const match = newTasks.find(t => t.sourceName === originalFile.sheetName)
                if (match) defaultTask = match
              }
            }

            setSelectedTaskId(defaultTask.id)
            setTasks([defaultTask])
          }
        } else {
          // Import mode: default all to selected
          const allIds = new Set(newTasks.map(t => t.id))
          setSelectedIds(allIds)
          setTasks(newTasks)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to parse files')
      } finally {
        setIsParsing(false)
      }
    }

    parseFiles()
  }, [selectedFiles, setTasks, mode]) // Removed 'allTasks' dependency to avoid loop

  const handleToggleTask = (id: string) => {
    if (mode === 'append' || mode === 'replace') {
      setSelectedTaskId(id)
      const task = allTasks.find(t => t.id === id)
      if (task) {
        // Re-apply target file's PK config to the newly selected task (only for append)
        if (mode === 'append') {
          const targetFile = projectFiles.find(f => f.id === targetTableId)
          const updatedColumns = task.columns.map(col => {
            const targetCol = targetFile?.columns.find(tc => tc.name === col.name)
            return {
              ...col,
              isPrimaryKey: targetCol
                ? !!targetCol.isPrimaryKey || !!targetCol.isKey
                : false,
            }
          })
          setTasks([{ ...task, columns: updatedColumns }])
        } else {
          // Replace mode: just set the task
          setTasks([task])
        }
      }
    } else {
      // Import mode: multi-select toggle
      const newSelected = new Set(selectedIds)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        // Limit Check for Import Mode
        const totalCount = projectFiles.length + newSelected.size
        if (!isActivated && totalCount >= TRIAL_FILE_LIMIT) {
          checkGate(t('trial_limit_reached_title'), () => {})
          return
        }
        newSelected.add(id)
      }
      setSelectedIds(newSelected)
      // Update global tasks list
      setTasks(allTasks.filter(t => newSelected.has(t.id)))
    }
  }

  // Use allTasks for rendering in all modes to ensure unselected items don't disappear
  const displayTasks = allTasks

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      {selectedFiles.length === 0 ? (
        <div
          onClick={handleSelectFiles}
          className="w-full max-w-xl border-2 border-dashed border-zinc-200 rounded-2xl p-12 flex flex-col items-center gap-4 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
            <Upload className="w-8 h-8 text-zinc-400 group-hover:text-indigo-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-zinc-900">
              {t('import_data')}
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              {t('import_data_desc')}
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-4 border-zinc-200 font-bold text-zinc-900 bg-white hover:bg-zinc-50"
          >
            {t('wizard.choose_files')}
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                {t('selected_data')}
              </h3>
              <p className="text-2xl font-black text-black uppercase mt-1">
                {t('wizard.worksheets_found', { count: displayTasks.length })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectFiles}
              disabled={isParsing}
              className="text-zinc-900 border-zinc-200 bg-white hover:bg-zinc-50"
            >
              {t('wizard.change_selection')}
            </Button>
          </div>

          <div className="bg-white border border-zinc-200 shadow-[4px_4px_0_0_rgba(0,0,0,0.05)] overflow-hidden rounded-xl">
            {isParsing ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-sm font-medium text-zinc-500 italic">
                  {t('wizard.analyzing_structure')}
                </span>
                {parseProgress && (
                  <span className="text-xs text-zinc-400 font-mono">
                    {parseProgress.isPercentage
                      ? `Processing... ${parseProgress.progress?.toFixed(0)}%`
                      : `Reading ${parseProgress.count?.toLocaleString()} rows...`}
                  </span>
                )}
              </div>
            ) : error ? (
              <div className="p-12 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-red-600 font-bold">{error}</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {displayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={cn(
                      'flex items-center gap-4 p-4 transition-colors group cursor-pointer',
                      mode === 'append' && selectedTaskId === task.id
                        ? 'bg-indigo-50/50'
                        : 'hover:bg-zinc-50'
                    )}
                  >
                    <div
                      className={cn(
                        'p-2 rounded-lg shrink-0',
                        (task.fileName || '').endsWith('.csv')
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-green-50 text-green-600'
                      )}
                    >
                      {(task.fileName || '').endsWith('.csv') ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <FileSpreadsheet className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 truncate">
                          {task.sourceName}
                        </span>
                        {task.sourceName !== task.fileName && (
                          <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-bold">
                            Sheet
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {task.fileName || 'Untitled'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono text-zinc-500">
                        {task.columns.length} Cols ·{' '}
                        {task.rowCount.toLocaleString()} Rows
                      </span>
                    </div>
                    <div className="pl-4">
                      {mode === 'append' || mode === 'replace' ? (
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                            selectedTaskId === task.id
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'border-zinc-200'
                          )}
                        >
                          {selectedTaskId === task.id && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                            selectedIds.has(task.id)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'border-zinc-200 bg-white'
                          )}
                        >
                          {selectedIds.has(task.id) && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {gateNode}
    </div>
  )
}
