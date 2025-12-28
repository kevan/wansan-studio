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
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { IngestionTask, ColumnConfig } from '@shared/types/wizard'
import { ColumnSchema } from '@shared/types'

export function FileSelectionStep() {
  const { selectedFiles, setFiles, tasks, setTasks, mode, targetTableId } = useWizardStore()
  const { files: projectFiles } = useProjectStore()
  const { t } = useTranslation('common')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Effect: When files change, parse them to get sheets/tasks
  useEffect(() => {
    if (selectedFiles.length === 0) return

    const parseFiles = async () => {
      setIsParsing(true)
      setError(null)
      const newTasks: IngestionTask[] = []

      try {
        for (const file of selectedFiles) {
          const res = await window.electronAPI.parseFile(file.path)
          if (res.success && res.data) {
            const results = Array.isArray(res.data) ? res.data : [res.data]

            results.forEach((item: any) => {
              // For append mode, inherit PK/Key from target table
              const targetFile = mode === 'append' ? projectFiles.find(f => f.id === targetTableId) : null;
              
              const columns: ColumnConfig[] = item.schema.columns.map(
                (c: ColumnSchema) => {
                  const targetCol = targetFile?.columns.find(tc => tc.name === c.name);
                  return {
                    name: c.name,
                    type: c.type,
                    isPrimaryKey: targetCol ? (!!targetCol.isPrimaryKey || !!targetCol.isKey) : false,
                  }
                }
              )

              newTasks.push({
                id: crypto.randomUUID(),
                sourceName: item.sheetName || file.name,
                fileName: file.name,
                filePath: file.path,
                tableName: item.tableName,
                finalTableName: item.tableName.startsWith('temp_ingest_') 
                  ? item.tableName.replace('temp_ingest_', 't_') 
                  : item.tableName,
                columns,
                previewData: item.preview || [],
                rowCount: item.rowCount || 0,
                mode: mode,
                status: 'pending',
              })
            })
          }
        }

        // In append mode, if multiple results found, we might need to let user pick.
        // For now, if mode is append, we default to the first one but will let user pick in the UI.
        setTasks(newTasks)
        if (newTasks.length > 0) setSelectedTaskId(newTasks[0].id)
      } catch (err: any) {
        setError(err.message || 'Failed to parse files')
      } finally {
        setIsParsing(false)
      }
    }

    parseFiles()
  }, [selectedFiles, setTasks, mode])

  // If append mode, filter tasks to only the selected one when moving forward
  useEffect(() => {
    if (mode === 'append' && selectedTaskId) {
      const activeTask = tasks.find(t => t.id === selectedTaskId)
      if (activeTask) {
        // We don't want to wipe other tasks yet, but we need to signal which one is active.
        // Actually, the wizard store should probably only have the ACTIVE tasks.
      }
    }
  }, [selectedTaskId, mode, tasks])

  const handleToggleTask = (id: string) => {
    if (mode === 'append') {
      setSelectedTaskId(id)
      // Update store to only have this one task?
      // Or just handle it during handleNext in Wizard.tsx.
      // Let's do it here for simplicity.
      const task = tasks.find(t => t.id === id)
      if (task) setTasks([task])
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
              Select Excel or CSV files to start
            </p>
          </div>
          <Button variant="outline" className="mt-4 border-zinc-200 font-bold">
            Choose Files
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                Selected Assets
              </h3>
              <p className="text-2xl font-black text-black uppercase mt-1">
                {tasks.length} Worksheets Found
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectFiles}
              disabled={isParsing}
            >
              Change Selection
            </Button>
          </div>

          <div className="bg-white border-2 border-black shadow-[8px_8px_0_0_#000] overflow-hidden">
            {isParsing ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-sm font-medium text-zinc-500 italic">
                  Analyzing data structures...
                </span>
              </div>
            ) : error ? (
              <div className="p-12 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-red-600 font-bold">{error}</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {tasks.map(task => (
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
                      {mode === 'append' ? (
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
                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
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
