import React, { useEffect, useState } from 'react'
import { useWizardStore } from '@/stores/useWizardStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { Button } from '../../ui/button'
import {
  AlertCircle,
  Check,
  Database,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { ColumnConfig, IngestionTask } from '@shared/types/wizard'
import { ColumnSchema } from '@shared/types'
import { DatabaseConnectorView } from './DatabaseConnectorView'

type SelectionTab = 'file' | 'database'

export function FileSelectionStep() {
  const [activeTab, setActiveTab] = useState<SelectionTab>('file')
  const { mode } = useWizardStore()
  const { t } = useTranslation('common')

  // Database connector is only available in 'import' mode for v1.6
  const isDBAvailable = mode === 'import'

  return (
    <div className="h-full flex flex-col bg-zinc-50/30">
      {/* Tab Switcher (Minimal Swiss Style) */}
      {isDBAvailable && (
        <div className="flex justify-center pt-6 shrink-0">
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 shadow-sm">
            <button
              onClick={() => setActiveTab('file')}
              className={cn(
                'px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
                activeTab === 'file'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {t('wizard.tab_file', 'File Upload')}
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={cn(
                'px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
                activeTab === 'database'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              <Database className="w-3.5 h-3.5" />
              {t('wizard.tab_database', 'Database')}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeTab === 'file' ? (
          <FileUploadView />
        ) : (
          <DatabaseConnectorView />
        )}
      </div>
    </div>
  )
}

function FileUploadView() {
  const { selectedFiles, setFiles, setTasks, mode, targetTableId } =
    useWizardStore()
  const { files: projectFiles } = useProjectStore()
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

  useEffect(() => {
    if (selectedFiles.length === 0) return

    const parseFiles = async () => {
      setIsParsing(true)
      setError(null)
      const newTasks: IngestionTask[] = []

      try {
        for (const file of selectedFiles) {
          const res = await window.electronAPI.parseFile(file.path)
          if (!res.success) throw new Error(res.error || 'Failed to parse file')
          
          if (res.data) {
            const results = Array.isArray(res.data) ? res.data : [res.data]
            const taskPromises = results.map(async (item: any) => {
              const targetFile = mode === 'append' ? projectFiles.find(f => f.id === targetTableId) : null
              const columns: ColumnConfig[] = item.schema.columns.map((c: ColumnSchema) => {
                const targetCol = targetFile?.columns.find(tc => tc.name === c.name)
                return {
                  name: c.name,
                  type: c.type,
                  isPrimaryKey: targetCol ? !!targetCol.isPrimaryKey || !!targetCol.isKey : false,
                }
              })

              let defaultTableName = item.tableName
              if (mode === 'import') {
                const res = await window.electronAPI.getUniqueTableName(file.name, item.sheetName)
                if (res.success) defaultTableName = res.data
              }

              const displayName = item.sheetName && item.sheetName !== file.name
                  ? `${file.name.replace(/\.xlsx?$/, '')} - ${item.sheetName}`
                  : item.sheetName || file.name.replace(/\.xlsx?$/, '')

              return {
                id: crypto.randomUUID(),
                sourceName: item.sheetName || item.tableName || file.name,
                fileName: file.name,
                filePath: file.path,
                tableName: item.tableName,
                finalTableName: defaultTableName,
                finalDisplayName: displayName,
                columns,
                previewData: item.preview || [],
                rowCount: item.rowCount || 0,
                mode: mode,
                status: 'pending',
                tempFilePath: item.schema?.tempFilePath,
                readOptions: item.schema?.readOptions,
              } as IngestionTask
            })

            const fileTasks = await Promise.all(taskPromises)
            newTasks.push(...fileTasks)
          }
        }

        setAllTasks(newTasks)
        if (mode === 'append' || mode === 'replace') {
          if (newTasks.length > 0) {
            let defaultTask = newTasks[0]
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
  }, [selectedFiles, setTasks, mode])

  const handleToggleTask = (id: string) => {
    if (mode === 'append' || mode === 'replace') {
      setSelectedTaskId(id)
      const task = allTasks.find(t => t.id === id)
      if (task) {
        if (mode === 'append') {
          const targetFile = projectFiles.find(f => f.id === targetTableId)
          const updatedColumns = task.columns.map(col => {
            const targetCol = targetFile?.columns.find(tc => tc.name === col.name)
            return { ...col, isPrimaryKey: targetCol ? !!targetCol.isPrimaryKey || !!targetCol.isKey : false }
          })
          setTasks([{ ...task, columns: updatedColumns }])
        } else setTasks([task])
      }
    } else {
      const newSelected = new Set(selectedIds)
      if (newSelected.has(id)) newSelected.delete(id)
      else newSelected.add(id)
      setSelectedIds(newSelected)
      setTasks(allTasks.filter(t => newSelected.has(t.id)))
    }
  }

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
                {t('wizard.worksheets_found', { count: allTasks.length })}
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
                      ? t('wizard.processing_percent', { progress: parseProgress.progress?.toFixed(0) })
                      : t('wizard.reading_rows', { count: parseProgress.count || 0 })}
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
                {allTasks.map(task => (
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
    </div>
  )
}
